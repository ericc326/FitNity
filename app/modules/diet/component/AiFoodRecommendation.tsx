import GeminiService from "../services/GeminiService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMealPlan } from "../component/MealPlanContext";
import PersonalInfoModal from "../component/PersonalInfoModal";
import { GEMINI_API_KEY } from "@env";
import { auth } from "../../../../firebaseConfig";

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
}

interface PersonalInfo {
  name: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  activityLevel: string;
  goal: string;
  dietaryRestrictions: string[];
  allergies: string[];
  targetCalories: string;
}

interface AIFoodRecommendationProps {
  visible: boolean;
  onClose: () => void;
  onSelectFood: (food: FoodItem) => void;
  selectedMealType?: string;
}

const AIFoodRecommendation: React.FC<AIFoodRecommendationProps> = ({
  visible,
  onClose,
  onSelectFood,
  selectedMealType = "breakfast",
}) => {
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [recommendations, setRecommendations] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);
  const {
    meals,
    dietInfo: contextDietInfo,
    healthInfo: contextHealthInfo,
    saveDietInfo,
  } = useMealPlan();

  // Set API key from .env automatically
  useEffect(() => {
    GeminiService.setApiKey(GEMINI_API_KEY);
  }, []);

  useEffect(() => {
    if (visible) {
      loadPersonalInfo();
    }
  }, [visible]);

  const loadPersonalInfo = async () => {
    // Check if both data pieces exist
    if (contextDietInfo && contextHealthInfo) {
      const info: PersonalInfo = {
        name: auth.currentUser?.displayName || "User",
        // Use REAL data from healthinfo collection
        age: contextHealthInfo.age || "0",
        gender: contextHealthInfo.gender || "Not Specified",
        weight: contextHealthInfo.weight || "0",
        height: contextHealthInfo.height || "0",
        // Use REAL data from dietinfo collection
        activityLevel: contextHealthInfo.level || "moderate",
        goal: contextDietInfo.goal,
        dietaryRestrictions: contextDietInfo.dietaryRestrictions,
        allergies: contextDietInfo.allergies,
        targetCalories: contextDietInfo.targetCalories,
      };
      setPersonalInfo(info);
      setHasCompletedSetup(true);
    } else {
      setHasCompletedSetup(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!hasCompletedSetup || !personalInfo) {
      setShowPersonalInfoModal(true);
      return;
    }
    await generateRecommendations();
  };

  const handlePersonalInfoComplete = async (info: any) => {
    // Save to Firebase via the context function we created earlier
    await saveDietInfo(info);
    setHasCompletedSetup(true);
    setShowPersonalInfoModal(false);
    // The useEffect will trigger generateRecommendations once dietInfo updates
  };

  const generateRecommendations = async () => {
    if (!personalInfo) return;

    setIsLoading(true);
    try {
      const recommendations = await GeminiService.generateMealRecommendations(
        personalInfo,
        selectedMealType,
        meals
      );
      setRecommendations(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      const fallbackRecommendations =
        getFallbackRecommendations(selectedMealType);
      setRecommendations(fallbackRecommendations);
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackRecommendations = (mealType: string) => {
    const fallbackMeals: Record<string, FoodItem[]> = {
      breakfast: [
        {
          id: "fallback_breakfast_1",
          name: "Oatmeal with Berries and Almonds",
          calories: 280,
          protein: 8,
          carbs: 45,
          fat: 6,
          category: "breakfast",
        },
        {
          id: "fallback_breakfast_2",
          name: "Greek Yogurt with Honey and Granola",
          calories: 200,
          protein: 15,
          carbs: 20,
          fat: 8,
          category: "breakfast",
        },
      ],
      lunch: [
        {
          id: "fallback_lunch_1",
          name: "Grilled Chicken Salad with Mixed Greens",
          calories: 350,
          protein: 25,
          carbs: 15,
          fat: 18,
          category: "lunch",
        },
        {
          id: "fallback_lunch_2",
          name: "Quinoa Bowl with Roasted Vegetables",
          calories: 380,
          protein: 12,
          carbs: 45,
          fat: 14,
          category: "lunch",
        },
      ],
      dinner: [
        {
          id: "fallback_dinner_1",
          name: "Salmon with Roasted Vegetables",
          calories: 420,
          protein: 28,
          carbs: 20,
          fat: 22,
          category: "dinner",
        },
        {
          id: "fallback_dinner_2",
          name: "Lean Beef Stir Fry with Brown Rice",
          calories: 380,
          protein: 25,
          carbs: 25,
          fat: 18,
          category: "dinner",
        },
      ],
      snacks: [
        {
          id: "fallback_snacks_1",
          name: "Apple Slices with Almond Butter",
          calories: 180,
          protein: 4,
          carbs: 20,
          fat: 10,
          category: "snacks",
        },
        {
          id: "fallback_snacks_2",
          name: "Hummus with Carrot and Celery Sticks",
          calories: 150,
          protein: 6,
          carbs: 18,
          fat: 8,
          category: "snacks",
        },
      ],
    };

    return fallbackMeals[mealType] || fallbackMeals.breakfast;
  };

  const handleSelectFood = (food: FoodItem) => {
    onSelectFood(food);
    onClose();
  };

  const FoodCard = ({ food }: { food: FoodItem }) => (
    <TouchableOpacity
      style={styles.foodCard}
      onPress={() => handleSelectFood(food)}
    >
      <View style={styles.foodHeader}>
        <Text style={styles.foodName}>{food.name}</Text>
        <Text style={styles.foodCalories}>{food.calories} kcal</Text>
      </View>
      <View style={styles.nutritionInfo}>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Protein</Text>
          <Text style={styles.nutritionValue}>{food.protein}g</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Carbs</Text>
          <Text style={styles.nutritionValue}>{food.carbs}g</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Fat</Text>
          <Text style={styles.nutritionValue}>{food.fat}g</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (showPersonalInfoModal) {
      return (
        <PersonalInfoModal
          visible={showPersonalInfoModal}
          onClose={() => setShowPersonalInfoModal(false)}
          onComplete={handlePersonalInfoComplete}
        />
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>
            Generating personalized recommendations...
          </Text>
        </View>
      );
    }

    if (recommendations.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>AI Recommendations</Text>
          <Text style={styles.emptyDescription}>
            Get personalized meal suggestions based on your profile and goals.
          </Text>
          {hasCompletedSetup && (
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateRecommendations}
            >
              <Ionicons name="bulb" size={20} color="white" />
              <Text style={styles.generateButtonText}>
                Generate AI Recommendations
              </Text>
            </TouchableOpacity>
          )}
          {!hasCompletedSetup && (
            <TouchableOpacity
              style={styles.setupButton}
              onPress={() => setShowPersonalInfoModal(true)}
            >
              <Ionicons name="person-add" size={20} color="white" />
              <Text style={styles.setupButtonText}>Complete Profile Setup</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.recommendationsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Recommendations</Text>
          <Text style={styles.headerSubtitle}>
            Personalized for {personalInfo?.name || "you"}
          </Text>
          {personalInfo && (
            <View style={styles.profileInfo}>
              <Text style={styles.profileText}>
                {personalInfo.age} years old • {personalInfo.gender} •{" "}
                {personalInfo.weight}kg • {personalInfo.height}cm
              </Text>
              <Text style={styles.profileText}>
                Goal: {personalInfo.goal.replace("_", " ")} • Target:{" "}
                {personalInfo.targetCalories} kcal
              </Text>
            </View>
          )}
        </View>
        <View style={styles.recommendationsList}>
          {recommendations.map((food) => (
            <FoodCard key={food.id} food={food} />
          ))}
        </View>
        <TouchableOpacity
          style={styles.regenerateButton}
          onPress={generateRecommendations}
        >
          <Ionicons name="refresh" size={20} color="#4CAF50" />
          <Text style={styles.regenerateButtonText}>
            Generate New Recommendations
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text>AI Food Recommendations</Text>
          <View />
        </View>
        {renderContent()}
      </SafeAreaView>
    </Modal>
  );
};

export default AIFoodRecommendation;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1e3ec" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  setupButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  setupButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  generateButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  generateButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  recommendationsContainer: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 20 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  headerSubtitle: { fontSize: 16, color: "#666", marginBottom: 12 },
  profileInfo: {
    backgroundColor: "#E8F5E8",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  profileText: { fontSize: 12, color: "#4CAF50", fontWeight: "500" },
  recommendationsList: { paddingHorizontal: 20, gap: 12 },
  foodCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  foodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  foodName: { fontSize: 16, fontWeight: "600", color: "#333", flex: 1 },
  foodCalories: { fontSize: 14, color: "#4CAF50", fontWeight: "600" },
  nutritionInfo: { flexDirection: "row", gap: 16 },
  nutritionItem: { flex: 1 },
  nutritionLabel: { fontSize: 12, color: "#666", marginBottom: 2 },
  nutritionValue: { fontSize: 14, fontWeight: "600", color: "#333" },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: "#E8F5E8",
    borderRadius: 12,
    gap: 8,
  },
  regenerateButtonText: { fontSize: 16, color: "#4CAF50", fontWeight: "600" },
});
