import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ImageStyle,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Markdown, { MarkdownIt } from "react-native-markdown-display";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { Ionicons } from "@expo/vector-icons";
import { OPENAI_API_KEY } from "@env";

type NutritionData = {
  Calories: number;
  Protein: number;
  Carbohydrates: number;
  Fat: number;
  Fiber: number;
  Explanation: string;
  "Health Score": number;
  "Key vitamins & minerals": string[];
};

const markdownStyles = {
  body: { fontSize: 16, lineHeight: 24, color: "#ddd" },
  heading1: { fontSize: 22, fontWeight: "700", marginTop: 20, color: "#fff" },
  heading2: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    color: "#e5e5e5",
  },
  list_item: { marginBottom: 8, color: "#9f9f9fff" },
};

export default function AiMealPlanner() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [jsonData, setJsonData] = useState<NutritionData | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission required to access the photo library.");
      return;
    }

    const img = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.3,
      base64: true,
    });

    if (!img.canceled) {
      const asset = img.assets[0];

      setSelectedImage(asset.uri);

      if (!asset.base64) {
        alert("Cannot read base64 from this image. Try a smaller image.");
        setBase64Image(null);
        return;
      }

      setBase64Image(asset.base64);
      setResult("");
      setJsonData(null);
    }
  };

  const normalizeJsonData = (data: any) => {
    if (!data) return null;
    let vitamins: string[] = [];

    if (Array.isArray(data["Key vitamins & minerals"])) {
      vitamins = data["Key vitamins & minerals"];
    } else if (typeof data["Key vitamins & minerals"] === "object") {
      vitamins = Object.entries(data["Key vitamins & minerals"]).map(
        ([k, v]) => `${k}: ${v}`
      );
    }

    return {
      ...data,
      "Key vitamins & minerals": vitamins,
    };
  };

  const analyzeFoodDirectly = async () => {
    if (!base64Image) return;

    try {
      setLoading(true);

      // 1. We define the prompt directly here (copied from your server.js)
      const prompt = `You are a professional nutritionist AI. 
    Analyze the food in the given image and return the result in two parts:
    
    1: JSON object of Nutrition Breakdowns with the following fields:  
       - Calories (kcal)  
       - Protein (g)  
       - Carbohydrates (g)  
       - Fat (g)  
       - Fiber (g)  
       - Key vitamins & minerals (if identifiable)  
       - Health Score (0-100) with short explanation.
      Make sure the JSON is valid and can be parsed.
    
    2: Markdown text provides a structured report with the following sections:
        1. Health Advice  
        2. Alternative Suggestions  
        3. Summary 
    
    Format the answer in clear markdown.`;

      // 2. Direct fetch to OpenAI (Bypassing localhost)
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`, // OR put your key string here "sk-..."
          },
          body: JSON.stringify({
            model: "gpt-4o-mini", // Use gpt-4o-mini for speed/cost
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                  },
                ],
              },
            ],
            max_tokens: 1000,
          }),
        }
      );

      const data = await response.json();

      // 3. Error Handling
      if (data.error) {
        console.error("OpenAI Error:", data.error.message);
        setResult("Error: " + data.error.message);
        setLoading(false);
        return;
      }

      // 4. Extract the content directly
      const content = data.choices[0].message.content;

      // 5. Parse Logic (Same as before, adapted for direct content)
      const jsonMatch = content.match(/```json([\s\S]*?)```/);
      let resJson: NutritionData | null = null;

      if (jsonMatch) {
        let rawJson = jsonMatch[1].trim();
        rawJson = rawJson.replace(/\/\/.*$/gm, ""); // Remove comments

        try {
          resJson = JSON.parse(rawJson);
          const normalized = normalizeJsonData(resJson);
          setJsonData(normalized);
        } catch (err) {
          console.error("JSON parse error:", err);
        }
      }

      const markdown = content.replace(/```json[\s\S]*?```/, "").trim();
      setResult(markdown);
    } catch (err) {
      console.error("Network Error:", err);
      setResult(
        "Error analyzing image. Please check your internet connection."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerSubtitle}>
            🍽 Upload your meal and let AI give you insights
          </Text>
        </View>

        {/* Selected Image */}
        {selectedImage && (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.image as ImageStyle} // ← here
            />
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Select Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.analyzeButton,
              { backgroundColor: base64Image ? "#22C55E" : "#94A3B8" },
            ]}
            disabled={!base64Image || loading}
            onPress={analyzeFoodDirectly}
          >
            <Ionicons
              name={loading ? "hourglass-outline" : "analytics-outline"}
              size={20}
              color="#fff"
            />
            <Text style={styles.buttonText}>
              {loading ? "Analyzing..." : "AI Analyze"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {loading && <ActivityIndicator size="large" color="#3B82F6" />}

        {/* Nutrition Summary */}
        {jsonData && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nutrition Summary</Text>

            {/* Circular Score */}
            <View style={styles.scoreWrapper}>
              <AnimatedCircularProgress
                size={160}
                width={14}
                fill={jsonData["Health Score"]}
                tintColor={
                  jsonData["Health Score"] >= 75
                    ? "#22C55E"
                    : jsonData["Health Score"] >= 50
                      ? "#FACC15"
                      : "#EF4444"
                }
                backgroundColor="#E5E7EB"
              >
                {(fill: number) => (
                  <Text style={styles.scoreText}>{Math.round(fill)}/100</Text>
                )}
              </AnimatedCircularProgress>
            </View>

            {/* Nutrition Facts */}
            <View>
              {[
                ["flame-outline", "Calories", jsonData.Calories + " kcal"],
                ["fitness-outline", "Protein", jsonData.Protein + " g"],
                ["pizza-outline", "Carbs", jsonData.Carbohydrates + " g"],
                ["egg-outline", "Fat", jsonData.Fat + " g"],
                ["leaf-outline", "Fiber", jsonData.Fiber + " g"],
              ].map(([icon, label, value], i) => (
                <View key={i} style={styles.factRow}>
                  <Ionicons name={icon as any} size={18} color="#555" />
                  <Text style={styles.factText}>
                    {label}: {value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Vitamins */}
            <Text style={styles.vitaminTitle}>Vitamins & Minerals</Text>
            <View style={styles.vitaminWrapper}>
              {jsonData["Key vitamins & minerals"].map((v, i) => (
                <View key={i} style={styles.vitaminTag}>
                  <Ionicons name="sparkles-outline" size={14} color="#3B82F6" />
                  <Text style={styles.vitaminText}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Markdown */}
        {result !== "" && (
          <View style={styles.markdownCard}>
            <Markdown
              markdownit={MarkdownIt({
                typographer: true,
                breaks: true,
                linkify: true,
              })}
              style={markdownStyles}
            >
              {result}
            </Markdown>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },

  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  headerContainer: { alignItems: "center", marginBottom: 20 },
  headerSubtitle: { fontSize: 14, color: "#bfb9d6", marginTop: -20 },

  /* IMAGE */
  imageWrapper: { alignItems: "center", marginBottom: 20 },
  image: {
    width: "100%",
    height: 260,
    borderRadius: 20,
    resizeMode: "cover",
    borderWidth: 2,
    borderColor: "#3C3952",
  },

  /* BUTTONS */
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  pickButton: {
    flexDirection: "row",
    backgroundColor: "#5A6DF0",
    paddingVertical: 14,
    flex: 1,
    justifyContent: "center",
    borderRadius: 14,
    alignItems: "center",
    marginRight: 8,
  },
  analyzeButton: {
    flexDirection: "row",
    paddingVertical: 14,
    flex: 1,
    justifyContent: "center",
    borderRadius: 14,
    alignItems: "center",
    marginLeft: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },

  /* MAIN CARD */
  card: {
    backgroundColor: "#3C3952",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#fff",
  },

  scoreWrapper: { alignItems: "center", marginBottom: 20 },
  scoreText: { fontSize: 24, fontWeight: "bold", color: "#fff" },

  factRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  factText: { marginLeft: 8, fontSize: 15, color: "#ddd" },

  vitaminTitle: {
    marginTop: 20,
    fontWeight: "bold",
    fontSize: 16,
    color: "#fff",
  },

  vitaminWrapper: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  vitaminTag: {
    flexDirection: "row",
    backgroundColor: "#5A6DF0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignItems: "center",
    marginRight: 6,
    marginBottom: 6,
  },
  vitaminText: {
    marginLeft: 4,
    color: "#fff",
    fontSize: 12,
  },

  /* MARKDOWN BOX */
  markdownCard: {
    backgroundColor: "#3C3952",
    borderRadius: 20,
    padding: 20,
    marginBottom: 40,
  },
});
