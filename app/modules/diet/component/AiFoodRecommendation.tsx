import GeminiService from "../services/GeminiService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMealPlan } from "../component/MealPlanContext";
import PersonalInfoModal from "../component/PersonalInfoModal";
import { GEMINI_API_KEY } from "@env";
import { auth } from "../../../../firebaseConfig";

// 1. UPDATED INTERFACE to include Recipe Details
interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  ingredients?: string[];
  instructions?: string[];
}

const safeString = (value: any) => (value ? String(value) : "");

interface AIFoodRecommendationProps {
  visible: boolean;
  onClose: () => void;
  onSelectFood: (food: FoodItem) => void;
  selectedMealType?: string | null;
}

const AIFoodRecommendation: React.FC<AIFoodRecommendationProps> = ({
  visible,
  onClose,
  onSelectFood,
  selectedMealType,
}) => {
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [recommendations, setRecommendations] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // NEW STATE: For viewing recipe details
  const [selectedRecipe, setSelectedRecipe] = useState<FoodItem | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  const {
    meals,
    dietInfo: contextDietInfo,
    healthInfo: contextHealthInfo,
    saveDietInfo,
  } = useMealPlan();

  const personalInfo = useMemo(() => {
    if (!contextDietInfo || !contextHealthInfo) return null;
    return {
      name: auth.currentUser?.displayName || "User",
      age: safeString(contextHealthInfo.age),
      gender: safeString(contextHealthInfo.gender),
      weight: safeString(contextHealthInfo.weight),
      height: safeString(contextHealthInfo.height),
      activityLevel: safeString(contextHealthInfo.level),
      goal: contextDietInfo.goal,
      dietaryRestrictions: contextDietInfo.dietaryRestrictions,
      allergies: contextDietInfo.allergies,
      targetCalories: contextDietInfo.targetCalories,
    };
  }, [contextDietInfo, contextHealthInfo]);

  const hasCompletedSetup = !!personalInfo;

  useEffect(() => {
    GeminiService.setApiKey(GEMINI_API_KEY);
  }, []);

  const handleGenerateRecommendations = async () => {
    if (!hasCompletedSetup || !personalInfo) {
      setShowPersonalInfoModal(true);
      return;
    }
    await generateRecommendations();
  };

  const handlePersonalInfoComplete = async (info: any) => {
    await saveDietInfo(info);
    setShowPersonalInfoModal(false);
  };

  const generateRecommendations = async () => {
    if (!personalInfo) return;
    setIsLoading(true);
    try {
      const typeForAI = selectedMealType || "healthy meal";
      const recommendations = await GeminiService.generateMealRecommendations(
        personalInfo,
        typeForAI,
        meals
      );
      setRecommendations(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      // Fallbacks would go here (omitted for brevity)
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFood = (food: FoodItem) => {
    onSelectFood(food);
    onClose();
  };

  const handleOpenRecipe = (food: FoodItem) => {
    setSelectedRecipe(food);
    setShowRecipeModal(true);
  };

  // --- UPDATED FOOD CARD COMPONENT ---
  const FoodCard = ({ food }: { food: FoodItem }) => {
    // We remove the isViewOnly check so the button ALWAYS shows

    return (
      <View style={styles.foodCard}>
        <View style={styles.foodHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.foodName}>{food.name}</Text>
            <Text style={styles.foodCalories}>{food.calories} kcal</Text>
          </View>

          {/* ACTION BUTTONS ROW */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {/* 1. RECIPE BOOK BUTTON */}
            <TouchableOpacity onPress={() => handleOpenRecipe(food)}>
              <Ionicons name="book-outline" size={24} color="#2196F3" />
            </TouchableOpacity>

            {/* 2. ADD BUTTON - ALWAYS VISIBLE NOW */}
            {/* We removed the {!isViewOnly && } check here */}
            <TouchableOpacity onPress={() => handleSelectFood(food)}>
              <Ionicons name="add-circle" size={32} color="#4CAF50" />
            </TouchableOpacity>
          </View>
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
      </View>
    );
  };

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
          {hasCompletedSetup ? (
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateRecommendations}
            >
              <Ionicons name="bulb" size={20} color="white" />
              <Text style={styles.generateButtonText}>
                Generate AI Recommendations
              </Text>
            </TouchableOpacity>
          ) : (
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
          {recommendations.map((food, index) => (
            <FoodCard key={`${food.id}-${index}`} food={food} />
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
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={{ fontWeight: "bold" }}>AI Food Recommendations</Text>
          <View />
        </View>
        {renderContent()}

        {/* --- RECIPE INSTRUCTIONS MODAL --- */}
        <Modal
          visible={showRecipeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRecipeModal(false)}
        >
          <View style={styles.recipeModalOverlay}>
            <View style={styles.recipeModalContent}>
              <View style={styles.recipeHeader}>
                <Text style={styles.recipeModalTitle}>How to Make It</Text>
                <TouchableOpacity onPress={() => setShowRecipeModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.recipeFoodName}>
                  {selectedRecipe?.name}
                </Text>

                <Text style={styles.sectionHeader}>🛒 Ingredients</Text>
                {selectedRecipe?.ingredients?.map((ing, i) => (
                  <Text key={i} style={styles.recipeText}>
                    • {ing}
                  </Text>
                )) || (
                  <Text style={styles.recipeText}>No ingredients listed.</Text>
                )}

                <Text style={[styles.sectionHeader, { marginTop: 15 }]}>
                  👨‍🍳 Instructions
                </Text>
                {selectedRecipe?.instructions?.map((step, i) => (
                  <Text key={i} style={styles.recipeText}>
                    {i + 1}. {step}
                  </Text>
                )) || (
                  <Text style={styles.recipeText}>
                    No instructions provided.
                  </Text>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.closeRecipeButton}
                onPress={() => setShowRecipeModal(false)}
              >
                <Text style={styles.closeRecipeText}>Close Recipe</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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

  // --- NEW RECIPE MODAL STYLES ---
  recipeModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  recipeModalContent: {
    width: "90%",
    height: "70%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  recipeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  recipeModalTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  recipeFoodName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 15,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 5,
  },
  recipeText: { fontSize: 14, color: "#555", marginBottom: 4, lineHeight: 20 },
  closeRecipeButton: {
    marginTop: 15,
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  closeRecipeText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
