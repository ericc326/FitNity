import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "@env";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const gemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

type ChatBoxProps = {
  visible: boolean;
  onClose: () => void;
};

const AIChatBox: React.FC<ChatBoxProps> = ({ visible, onClose }) => {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<
    { sender: "user" | "ai"; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const shouldShowSuggest =
    !loading &&
    (messages.length === 0 || messages[messages.length - 1]?.sender === "ai");
  const [healthInfoSummary, setHealthInfoSummary] = useState<string | null>(
    null
  );

  // Load health info when modal becomes visible
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (visible && uid) {
      loadHealthInfo(uid);
    }
  }, [visible]);

  async function loadHealthInfo(uid: string) {
    try {
      const colRef = collection(db, `users/${uid}/healthinfo`);
      const snap = await getDocs(query(colRef, limit(1)));

      if (snap.empty) {
        setHealthInfoSummary(null);
        return;
      }

      const data = snap.docs[0].data() as any;

      // Build concise summary from your schema (bmi, gender, healthInfo, height, level, weight)
      const parts: string[] = [];
      if (data.healthInfo) parts.push(`conditions: ${String(data.healthInfo)}`);
      if (data.gender) parts.push(`gender: ${String(data.gender)}`);

      const heightVal = data.height != null ? String(data.height).trim() : "";
      const weightVal = data.weight != null ? String(data.weight).trim() : "";

      if (heightVal) {
        const h = Number(heightVal.replace(/[^\d.]/g, ""));
        parts.push(`height: ${isNaN(h) ? heightVal : `${h} cm`}`);
      }
      if (weightVal) {
        const w = Number(weightVal.replace(/[^\d.]/g, ""));
        parts.push(`weight: ${isNaN(w) ? weightVal : `${w} kg`}`);
      }
      if (data.bmi !== undefined && data.bmi !== null) {
        const bmiNum = Number(data.bmi);
        parts.push(
          `BMI: ${isNaN(bmiNum) ? String(data.bmi) : bmiNum.toFixed(1)}`
        );
      }
      if (data.level) parts.push(`level: ${String(data.level)}`);

      const summary = parts.join(", ");
      setHealthInfoSummary(summary || null);
    } catch (err) {
      console.error("loadHealthInfo error:", err);
      setHealthInfoSummary(null);
    }
  }

  async function askGemini(prompt: string): Promise<string> {
    const healthSegment = healthInfoSummary
      ? `User health info: ${healthInfoSummary}`
      : `User health info: (none recorded)`;
    const systemInstruction = `
You are a helpful fitness & nutrition assistant. Always consider the user's recorded health conditions when giving advice.
If a suggestion may conflict with a condition (e.g., diabetes and sugary drinks), clearly warn and offer safer alternatives.
If the user's question is not about fitness, sport, exercise, health, nutrition, or diet, reply: "Sorry, I can only answer fitness and diet related questions."
Never give medical diagnoses; recommend consulting a healthcare professional for medical concerns.
`;

    const fullPrompt = `${systemInstruction.trim()}
    ${healthSegment}
    User question: ${prompt}`;

    try {
      const response = await gemini.models.generateContent({
        model: "gemini-2.0-flash",
        contents: fullPrompt,
      });

      if (!response || !response.text) {
        return "No valid response from Gemini.";
      }

      const text = response.text.trim();
      return text;
    } catch (err: any) {
      return "Failed to fetch response from Gemini.";
    }
  }

  // analyze recent workouts and return a brief summary  deterministic recommendations
  async function analyzeWorkoutsAndRecommend(uid: string) {
    try {
      // Read latest 10 schedules created by this user (created via CreateSchedule)
      const schedulesRef = collection(db, `users/${uid}/schedules`);
      const q = query(
        schedulesRef,
        where("completed", "==", true),
        orderBy("scheduledAt", "desc"),
        limit(10)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        return {
          summary: "No completed schedules found.",
          recommendation:
            "No schedule history — general recovery: light stretching, hydrate (300-500ml), 24h rest.",
          meta: null,
        };
      }

      // Collect names for the last 10 workouts and aggregate metrics across them
      const workoutNames: string[] = [];
      let totalVolume = 0; // aggregated sets * reps
      let totalRest = 0; // aggregated rest seconds
      let totalCount = 0;
      let lastVolume: number | null = null; // volume from the most recent doc (index 0)

      snap.docs.forEach((d, idx) => {
        console.log("analyzeWorkoutsAndRecommend doc data:", d.data());
        const data = d.data() as any;
        const name = String(data?.selectedWorkoutName ?? "unspecified");
        workoutNames.push(name);

        const sets = Number(data?.customSets) || 0;
        const reps = Number(data?.customReps) || 0;
        const rest = Number(data?.customRestSeconds) || 0;
        const volume = sets > 0 && reps > 0 ? sets * reps : 0;

        if (idx === 0) lastVolume = volume || null;
        totalVolume += volume;
        totalRest += rest;
        totalCount++;
      });

      const avgVolume =
        Math.round((totalVolume / Math.max(1, totalCount)) * 10) / 10;
      const avgRest =
        Math.round((totalRest / Math.max(1, totalCount)) * 10) / 10;

      // Deterministic recommendation rules based on aggregated averages
      let recommendation = "";
      if (lastVolume && lastVolume >= 100) {
        recommendation =
          "High volume recently — Recovery: 48–72h active rest, prioritize sleep, extra hydration (500–1000ml), mobility and foam rolling 10–15min.";
      } else if (avgVolume >= 60) {
        recommendation =
          "Generally high volume — Recovery: 48h light activity, mobility, 500ml hydration after session, protein snack within 60 minutes.";
      } else if (avgVolume >= 30) {
        recommendation =
          "Moderate volume — Recovery: 24–48h light activity, 300–500ml hydration post-workout, 5–10min stretching.";
      } else {
        recommendation =
          "Low volume — Recovery: short cooldown, 15–20min mobility or stretching, normal hydration and sleep.";
      }

      if (avgRest > 120) {
        recommendation +=
          " Note: long rest intervals recorded — consider pacing intensity.";
      } else if (avgRest > 60) {
        recommendation += " Rest intervals appear moderate.";
      }

      const summary = `Analyzed ${totalCount} completed sessions. Workouts (latest first): ${workoutNames.join(
        ", "
      )}. Avg volume (sets×reps): ${avgVolume}. Avg rest: ${avgRest}s.`;

      return {
        summary,
        recommendation,
        meta: {
          workoutNames,
          avgVolume,
          avgRest,
          lastVolume,
          count: totalCount,
        },
      };
    } catch (err) {
      console.error("analyzeWorkoutsAndRecommend error:", err);
      return {
        summary: "Error reading schedule history",
        recommendation:
          "General recovery: light stretching, hydrate, 24h rest.",
        meta: null,
      };
    }
  }

  const handleSuggestRecovery = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert(
        "Sign in required",
        "Please sign in to get personalized recovery tips."
      );
      return;
    }
    setLoading(true);

    const placeholder = "Generating recovery tips...";

    try {
      const analysis = await analyzeWorkoutsAndRecommend(currentUser.uid);
      const hasWorkouts = !!(
        analysis.meta &&
        analysis.meta.count &&
        analysis.meta.count > 0
      );
      const docTag = hasWorkouts
        ? "RECOVERY_REQUEST_GEMINI"
        : "RECOVERY_REQUEST";

      setMessages((prev) => [
        ...prev,
        { sender: "user", text: docTag },
        { sender: "ai", text: placeholder },
      ]);

      // Build a header with the recent exercise names (always shown if available)
      const workoutLine =
        hasWorkouts && analysis.meta?.workoutNames?.length
          ? `Completed workouts (latest first): ${analysis.meta.workoutNames.join(", ")}`
          : "";

      let finalText = analysis.recommendation;

      if (hasWorkouts) {
        const prompt = `You are an expert fitness coach. Based on this workout summary produce a concise, actionable post-workout recovery plan. 
        Workout summary: ${analysis.summary} 
        Context suggestion: ${analysis.recommendation} 
        Return a 1-2 sentence summary followed by short bullets for stretching, hydration (amount & timing), rest duration, and quick nutrition tips.`;
        try {
          const aiText = await askGemini(prompt);
          if (aiText && !aiText.toLowerCase().includes("sorry, i can only")) {
            finalText = aiText.trim();
          }
        } catch (e) {
          console.warn(
            "Gemini refine failed, using fallback recommendation",
            e
          );
        }
      }

      // Prepend the workout list line so names are always visible
      const combinedMessage = hasWorkouts
        ? `${workoutLine}\n\n${finalText}`
        : `No Completed Workouts Found.\n\nGeneral recovery: ${finalText}`;

      setMessages((prev) => {
        const copy = [...prev];
        const idx = copy.map((m) => m.text).lastIndexOf(placeholder);
        if (idx >= 0) copy[idx] = { sender: "ai", text: combinedMessage };
        else copy.push({ sender: "ai", text: combinedMessage });
        return copy;
      });

      await addDoc(collection(db, `users/${currentUser.uid}/aimessages`), {
        user: docTag,
        ai: combinedMessage,
        createdAt: serverTimestamp(),
        userId: currentUser.uid,
        recovery: true,
      });
    } catch (err) {
      console.error("handleSuggestRecovery error:", err);
      setMessages((prev) => {
        const copy = [...prev];
        const idx = copy.map((m) => m.text).lastIndexOf(placeholder);
        const errText = "Failed to generate recovery tips.";
        if (idx >= 0) copy[idx] = { sender: "ai", text: errText };
        else copy.push({ sender: "ai", text: errText });
        return copy;
      });
      Alert.alert("Error", "Failed to generate recovery tips.");
    } finally {
      setLoading(false);
    }
  };

  // To load messages when component mounts
  useEffect(() => {
    const loadMessages = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const messagesRef = collection(
          db,
          `users/${currentUser.uid}/aimessages`
        );
        const q = query(messagesRef, orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);

        const loadedMessages: { sender: "user" | "ai"; text: string }[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Add user message
          loadedMessages.push({
            sender: "user",
            text: data.user,
          });
          // Add AI response
          loadedMessages.push({
            sender: "ai",
            text: data.ai,
          });
        });

        setMessages(loadedMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    loadMessages();
  }, [visible]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    const onKeyboardShow = () => {
      // small delay so layout has updated before scrolling
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 280);
    };

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, () => {
      /* noop for now - kept to remove subscription properly */
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "Please sign in to use the chat feature");
      return;
    }

    const prompt = inputText.trim();
    if (!prompt) return;

    setMessages((prev) => [...prev, { sender: "user", text: prompt }]);
    setInputText("");
    setLoading(true);

    try {
      // Get AI response from Gemini
      const aiResponse = await askGemini(prompt);

      // Add both user and AI message to state as a pair
      setMessages((prev) => [...prev, { sender: "ai", text: aiResponse }]);

      // Store both user prompt and AI response in the same Firestore document
      await addDoc(collection(db, `users/${currentUser.uid}/aimessages`), {
        user: prompt,
        ai: aiResponse,
        createdAt: serverTimestamp(),
        userId: currentUser.uid,
      });
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Error getting response from Gemini." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.chatModalBox}>
          <KeyboardAvoidingView
            style={{
              flex: 1,
            }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.chatTitle}>AI Assistant</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            {/* Chat area */}
            <View style={styles.chatContent}>
              <ScrollView
                ref={scrollViewRef}
                style={{ width: "100%", flex: 1 }}
                contentContainerStyle={{ paddingVertical: 10, flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* ...existing messages rendering and suggest button ... */}
                {messages.length === 0 && (
                  <Text style={styles.message}>
                    Hi! Ask me anything about fitness and health.
                  </Text>
                )}
                {messages.map((msg, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.messageContainer,
                      msg.sender === "user"
                        ? styles.userMessageContainer
                        : styles.aiMessageContainer,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        msg.sender === "user"
                          ? styles.userBubble
                          : styles.aiBubble,
                      ]}
                    >
                      <Text style={styles.senderLabel}>
                        {msg.sender === "user" ? "You" : "AI"}
                      </Text>
                      <Text
                        style={[
                          styles.messageText,
                          msg.sender === "user"
                            ? styles.userMessageText
                            : styles.aiMessageText,
                        ]}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  </View>
                ))}
                {shouldShowSuggest && (
                  <View style={styles.suggestButtonContainer}>
                    <TouchableOpacity
                      onPress={handleSuggestRecovery}
                      style={styles.suggestButton}
                    >
                      <Text style={styles.suggestButtonText}>
                        Suggest recovery tips
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {loading && <Text style={styles.message}>AI is typing...</Text>}
              </ScrollView>
            </View>
            {/* Input and Send Button */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type your message..."
                  placeholderTextColor="#888"
                  style={styles.textInput}
                />
                <TouchableOpacity
                  onPress={handleSend}
                  style={[
                    styles.sendButton,
                    !inputText.trim() && { opacity: 0.5 },
                  ]}
                  disabled={!inputText.trim()}
                >
                  <MaterialCommunityIcons name="send" size={20} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30, 30, 46, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  chatModalBox: {
    backgroundColor: "#000",
    borderRadius: 20,
    padding: 16,
    minWidth: 300,
    height: "80%",
    width: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    justifyContent: "space-between",
  },
  // Header styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  closeBtn: {
    fontSize: 20,
    color: "#999",
  },
  // Chat content styles
  chatContent: {
    flex: 1,
  },
  message: {
    fontSize: 16,
    color: "#fff",
    padding: 8,
    textAlign: "center",
  },
  messageContainer: {
    width: "100%",
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  aiMessageContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: "#4a90e2",
    borderTopRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#373e4e",
    borderTopLeftRadius: 4,
  },
  senderLabel: {
    fontSize: 12,
    marginBottom: 4,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: "#ffffff",
  },
  aiMessageText: {
    color: "#ffffff",
  },
  suggestButton: {
    backgroundColor: "#4a90e2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
    height: 30,
  },
  suggestButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  suggestButtonContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  // Input area styles
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderColor: "#eee",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#424242",
    borderRadius: 20,
    paddingHorizontal: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "transparent",
  },
  sendButton: {
    backgroundColor: "white",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: "#000",
    fontWeight: "600",
  },
});

export default AIChatBox;
