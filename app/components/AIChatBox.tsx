import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "@env";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const gemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function askGemini(prompt: string): Promise<string> {
  const systemInstruction = `
You are a helpful assistant that only answers questions related to fitness, sport, exercise, health, nutrition, or diet. 
If the question is not related to these topics, politely reply: "Sorry, I can only answer fitness and diet related questions."
`;

  const fullPrompt = `${systemInstruction}\nUser: ${prompt}`;

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
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.chatModalBox} onPress={() => {}}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0} // adjust if you have a header
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
        </Pressable>
      </Pressable>
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
