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
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "@env";

const gemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Add this function inside your component file (outside the component)
async function askGemini(prompt: string): Promise<string> {
  console.log("Asking Gemini with prompt:", prompt);
  console.log("GEMINI_API_KEY available:", !!GEMINI_API_KEY);
  const systemInstruction = `
You are a helpful assistant that only answers questions related to fitness, exercise, health, nutrition, or diet. 
If the question is not related to these topics, politely reply: "Sorry, I can only answer fitness and diet related questions."
`;

  const fullPrompt = `${systemInstruction}\nUser: ${prompt}`;

  try {
    console.log("Making API call to Gemini...");
    const response = await gemini.models.generateContent({
      model: "gemini-2.0-flash",
      contents: fullPrompt,
    });
    console.log("Raw API response:", response);

    if (!response || !response.text) {
      console.log("No response or text from API");
      return "No valid response from Gemini.";
    }

    const text = response.text.trim();
    console.log("Processed response:", text);
    return text;
  } catch (err: any) {
    console.error("Gemini API error:", err);
    console.error("Error details:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
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
      console.log("AI Response:", aiResponse);

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
      console.error("Error in handleSend:", error);
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.chatTitle}>AI Assistant</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          {/* Chat area placeholder */}
          <View style={styles.chatContent}>
            <ScrollView
              ref={scrollViewRef}
              style={{ width: "100%", flex: 1 }}
              contentContainerStyle={{ paddingVertical: 10, flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 && (
                <Text style={styles.message}>Hi! Ask me anything.</Text>
              )}
              {messages.map((msg, idx) => (
                <Text
                  key={idx}
                  style={[
                    styles.message,
                    {
                      alignSelf:
                        msg.sender === "user" ? "flex-end" : "flex-start",
                      color: msg.sender === "user" ? "#4a90e2" : "#fff",
                      marginVertical: 4,
                    },
                  ]}
                >
                  {msg.sender === "user" ? "You: " : "AI: "}
                  {msg.text}
                </Text>
              ))}
              {loading && <Text style={styles.message}>AI is typing...</Text>}
            </ScrollView>
          </View>
          {/* Input and Send Button */}
          <View style={styles.inputContainer}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor="#888"
              style={styles.textInput}
            />
            <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    height: 600,
    width: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    justifyContent: "space-between",
  },
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
  chatContent: {
    flex: 1,
  },
  message: {
    fontSize: 16,
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  textInput: {
    flex: 1,
    backgroundColor: "rgba(38,33,53,0.25)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#373e4e",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default AIChatBox;
