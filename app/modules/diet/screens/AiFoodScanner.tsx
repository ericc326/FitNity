import { useState } from "react";
import {
  View,
  Text,
  Image,
  ImageStyle,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Markdown, { MarkdownIt } from "react-native-markdown-display";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { Ionicons } from "@expo/vector-icons";
import { OPENAI_API_KEY } from "@env";
import { useNavigation } from "@react-navigation/native";
import { useMealPlan } from "../component/MealPlanContext";

type NutritionData = {
  FoodName: string;
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
  const navigation = useNavigation();
  const { updateMeal } = useMealPlan();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [jsonData, setJsonData] = useState<NutritionData | null>(null);

  const [showMealSelector, setShowMealSelector] = useState(false);

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

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Permission required to access the camera.");
      return;
    }

    const img = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.3,
      base64: true,
    });

    if (!img.canceled) {
      const asset = img.assets[0];
      setSelectedImage(asset.uri);

      if (!asset.base64) {
        alert("Cannot read base64. Try again.");
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

      const prompt = `You are a professional nutritionist AI. 
    Analyze the food in the given image and return the result in two parts:
    
    1: JSON object of Nutrition Breakdowns with the following fields:  
       - FoodName (short, concise name of the food, e.g., "Chicken Rice") <--- Add this
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

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
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

      if (data.error) {
        console.error("OpenAI Error:", data.error.message);
        setResult("Error: " + data.error.message);
        setLoading(false);
        return;
      }

      const content = data.choices[0].message.content;

      const jsonMatch = content.match(/```json([\s\S]*?)```/);
      let resJson: NutritionData | null = null;

      if (jsonMatch) {
        let rawJson = jsonMatch[1].trim();
        rawJson = rawJson.replace(/\/\/.*$/gm, "");
        try {
          resJson = JSON.parse(rawJson);
          const normalized = normalizeJsonData(resJson);
          setJsonData(normalized);
        } catch (err) {
          console.error("JSON parse error:", err);
        }
      }

      // Cleanup text logic
      let cleanText = content.replace(/```json[\s\S]*?```/, "");
      cleanText = cleanText.replace(
        /1\.?\s*Nutrition\s*Breakdown\s*JSON/gi,
        ""
      );
      cleanText = cleanText.replace(/2\.?\s*Structured\s*Report/gi, "");
      setResult(cleanText.trim());
    } catch (err) {
      console.error("Network Error:", err);
      setResult("Error analyzing image.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLog = (mealType: string) => {
    if (!jsonData) return;

    // 1. Convert AI data to your App's food format
    const foodItem = {
      id: Date.now().toString(),
      name: jsonData.FoodName || "Scanned Meal",
      calories: Number(jsonData.Calories) || 0,
      protein: Number(jsonData.Protein) || 0,
      carbs: Number(jsonData.Carbohydrates) || 0,
      fat: Number(jsonData.Fat) || 0,
      category: "scanned",
    };

    updateMeal(mealType, foodItem);
    setShowMealSelector(false);
    Alert.alert("Success", `${foodItem.name} added to ${mealType}!`);
    navigation.goBack();
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
              style={styles.image as ImageStyle}
            />
          </View>
        )}

        {/* Buttons Row */}
        <View style={styles.actionSection}>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
              <Ionicons name="images-outline" size={24} color="#fff" />
              <Text style={styles.mediaButtonText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaButton} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={24} color="#fff" />
              <Text style={styles.mediaButtonText}>Camera</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.analyzeButton,
              { backgroundColor: base64Image ? "#22C55E" : "#3C3952" },
              (!base64Image || loading) && { opacity: 0.5 },
            ]}
            disabled={!base64Image || loading}
            onPress={analyzeFoodDirectly}
          >
            <Ionicons
              name={loading ? "hourglass-outline" : "sparkles"}
              size={24}
              color="#fff"
              style={{ marginRight: 10 }}
            />
            <Text style={styles.analyzeButtonText}>
              {loading ? "Analyzing..." : "Analyze Food"}
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

        {/* Markdown Report */}
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

        {/* Add to Log Button (Visible only after analysis) */}
        {jsonData && (
          <TouchableOpacity
            style={styles.addToLogButton}
            onPress={() => setShowMealSelector(true)}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addToLogText}>Add to Daily Log</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Meal Selector Modal */}
      {showMealSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Meal Time</Text>
            {["breakfast", "lunch", "dinner", "snacks"].map((meal) => (
              <TouchableOpacity
                key={meal}
                style={styles.mealOption}
                onPress={() => handleAddToLog(meal)}
              >
                <Text style={styles.mealOptionText}>
                  {meal.charAt(0).toUpperCase() + meal.slice(1)}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMealSelector(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#bfb9d6",
    marginTop: -20,
  },
  imageWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
  image: {
    width: "100%",
    height: 260,
    borderRadius: 20,
    resizeMode: "cover",
    borderWidth: 2,
    borderColor: "#3C3952",
  },
  actionSection: {
    marginBottom: 20,
    gap: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  mediaButton: {
    flex: 1,
    backgroundColor: "#5A6DF0",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  mediaButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  analyzeButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  analyzeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  addToLogButton: {
    backgroundColor: "#22C55E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 40,
    gap: 8,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  addToLogText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
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
  scoreWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  factRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  factText: {
    marginLeft: 8,
    fontSize: 15,
    color: "#ddd",
  },
  vitaminTitle: {
    marginTop: 20,
    fontWeight: "bold",
    fontSize: 16,
    color: "#fff",
  },
  vitaminWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
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
  markdownCard: {
    backgroundColor: "#3C3952",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  mealOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  mealOptionText: {
    fontSize: 16,
    color: "#333",
  },
  cancelButton: {
    marginTop: 15,
    alignItems: "center",
  },
  cancelText: {
    color: "#FF5722",
    fontWeight: "bold",
  },
});
