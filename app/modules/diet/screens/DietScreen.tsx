import AIFoodRecommendation from "../component/AiFoodRecommendation";
import { useMealPlan } from "../component/MealPlanContext";
import React, { useEffect, useState } from "react";

import { GEMINI_API_KEY, SPOONACULAR_API_KEY } from "@env";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { DietStackParamList } from "../navigation/DietNavigator";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

const MealsScreen = () => {
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [showCustomMealModal, setShowCustomMealModal] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);

  // Custom Meal Form State
  const [customMealData, setCustomMealData] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [recommendedMeals, setRecommendedMeals] = useState<any[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const navigation = useNavigation<DietScreenNavigationProp>();
  type DietScreenNavigationProp = NativeStackNavigationProp<
    DietStackParamList,
    "DietHome"
  >;

  const {
    meals,
    updateMeal,
    removeMeal,
    getTotalNutrition,
    addCustomMeal,
    dietInfo,
    isLoading,
    changeDate,
  } = useMealPlan();

  // This automatically becomes true if dietInfo exists and has calories
  const hasCompletedSetup = !!(dietInfo && dietInfo.targetCalories);

  useEffect(() => {
    if (!hasCompletedSetup) setRecommendedMeals([]);
  }, [hasCompletedSetup]);

  const totalNutrition = getTotalNutrition();

  // Initialize Date
  useEffect(() => {
    const todayString = new Date().toISOString().split("T")[0];
    changeDate(todayString);
  }, []);

  const handleSelectFood = (food: any) => {
    if (selectedMealId) {
      updateMeal(selectedMealId, food);
    }
    setShowAIRecommendations(false);
    setSelectedMealId(null);
  };

  const handleRemoveMeal = (mealId: string) => {
    const mealItem = meals.find((m) => m.id === mealId);
    if (!mealItem?.docId) return;

    Alert.alert("Remove Meal", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeMeal(mealItem.docId!),
      },
    ]);
  };

  const handleAddCustomMeal = () => {
    if (!customMealData.name || !customMealData.calories) {
      Alert.alert("Error", "Please enter at least a meal name and calories.");
      return;
    }

    const calories = parseInt(customMealData.calories) || 0;
    const protein = parseInt(customMealData.protein) || 0;
    const carbs = parseInt(customMealData.carbs) || 0;
    const fat = parseInt(customMealData.fat) || 0;

    if (selectedMealId) {
      addCustomMeal(
        selectedMealId,
        customMealData.name,
        calories,
        protein,
        carbs,
        fat
      );
      setShowCustomMealModal(false);
      setSelectedMealId(null);
      setCustomMealData({
        name: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
      });
    }
  };

  const fetchRecommendedMeals = async () => {
    if (!hasCompletedSetup) return;
    // Gatekeeper: If we already have data or no API key, don't call
    if (recommendedMeals.length > 0 || !SPOONACULAR_API_KEY) return;

    setLoadingRecipes(true);
    try {
      const target = dietInfo ? parseInt(dietInfo.targetCalories) : 2000;
      const remainingCalories = Math.max(target - totalNutrition.calories, 300);
      const maxCalories = Math.round(remainingCalories / 2);

      const url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_API_KEY}&number=6&minProtein=20&maxCalories=${maxCalories}&addRecipeNutrition=true`;

      const res = await fetch(url);
      const data = await res.json();
      setRecommendedMeals(data.results || []);
    } catch (error) {
      console.error("Spoonacular error:", error);
    } finally {
      setLoadingRecipes(false);
    }
  };

  useEffect(() => {
    if (!isLoading && dietInfo && recommendedMeals.length === 0) {
      fetchRecommendedMeals();
    }
  }, [isLoading, dietInfo, totalNutrition.calories]);

  const handleAIRecommendations = () => {
    // If setup is not complete, we might still want to show the modal
    // to let the AI help set them up, or redirect them.
    // Based on your UI text "Complete Setup", users expect an action here.
    if (!hasCompletedSetup) {
      // You can either open the AI to help them setup, or navigate to a setup screen.
      // For now, I'll keep your original logic which opens the modal:
      setShowAIRecommendations(true);
      return;
    }

    const apiKey = GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API key is missing in .env!");
      return;
    }

    setShowAIRecommendations(true);
  };

  // Helper for rendering a single meal row
  const MealItem = ({ meal }: { meal: any }) => (
    <View style={styles.mealItem}>
      <View style={styles.mealHeader}>
        <View style={styles.mealInfo}>
          <Text style={styles.mealTitle}>{meal.title}</Text>
          <Text style={styles.mealTime}>{meal.time}</Text>
        </View>
        <View style={styles.mealActions}>
          {meal.hasFood && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveMeal(meal.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF5722" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setSelectedMealId(meal.id);
              handleAIRecommendations();
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>
      {meal.food ? (
        <View style={styles.foodInfo}>
          <Text style={styles.foodName}>{meal.food.name}</Text>
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionText}>{meal.food.calories} kcal</Text>
            <Text style={styles.nutritionText}>
              {meal.food.protein}g protein
            </Text>
            <Text style={styles.nutritionText}>{meal.food.carbs}g carbs</Text>
            <Text style={styles.nutritionText}>{meal.food.fat}g fat</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyMeal}>
          <Text style={styles.emptyText}>No meal planned</Text>
          <Text style={styles.emptySubtext}>Tap + to add a meal</Text>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="fff" />
          <Text style={styles.loadingText}>Loading your meals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Disclaimer Modal */}
      <Modal visible={showDisclaimer} transparent animationType="fade">
        <View style={styles.modalOverlayDisclaimer}>
          <View style={styles.disclaimerContent}>
            <Text style={styles.exclamationMark}>❗</Text>
            <Text style={styles.disclaimerTitle}>Important Disclaimer</Text>
            <Text style={styles.modalText}>
              The recommendations provided in this app are for informational
              purposes only. Please follow your doctor's advice and consult a
              healthcare professional if you have any health concerns.
            </Text>
            <TouchableOpacity
              style={styles.okButton}
              onPress={() => setShowDisclaimer(false)}
            >
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Are You Eating Healthy?</Text>
        </View>

        {/* Nutrition Circles */}
        <View style={styles.topNutritionOverview}>
          <View style={styles.circleMetric}>
            <View style={[styles.circleIcon, { backgroundColor: "#FF572220" }]}>
              <Ionicons name="flame" size={18} color="#FF5722" />
            </View>
            <View>
              <Text style={styles.metricLabel}>Calories</Text>
              <Text style={styles.metricValue}>
                {totalNutrition.calories}/{dietInfo?.targetCalories}
              </Text>
              <Text style={styles.metricUnit}>kcal</Text>
              <Text style={styles.metricPercentage}>
                {dietInfo?.targetCalories
                  ? `${Math.min(
                      Math.round(
                        (totalNutrition.calories /
                          parseInt(dietInfo.targetCalories)) *
                          100
                      ),
                      100
                    )}%`
                  : "0%"}
              </Text>
            </View>
          </View>

          <View style={styles.circleMetric}>
            <View style={[styles.circleIcon, { backgroundColor: "#4CAF5020" }]}>
              <Ionicons name="restaurant" size={18} color="#4CAF50" />
            </View>
            <View>
              <Text style={styles.metricLabel}>Protein</Text>
              <Text
                style={styles.metricValue}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {totalNutrition.protein}/{dietInfo?.targetProtein || "0"}g
              </Text>
              <Text style={styles.metricPercentage}>
                {dietInfo?.targetProtein
                  ? `${Math.min(
                      Math.round(
                        (totalNutrition.protein /
                          parseInt(dietInfo.targetProtein.toString())) *
                          100
                      ),
                      100
                    )}%`
                  : "0%"}
              </Text>
            </View>
          </View>

          <View style={styles.circleMetric}>
            <View style={[styles.circleIcon, { backgroundColor: "#2196F320" }]}>
              <Ionicons name="leaf" size={18} color="#2196F3" />
            </View>
            <View>
              <Text style={styles.metricLabel}>Carbs</Text>
              <Text
                style={styles.metricValue}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {totalNutrition.carbs}/{dietInfo?.targetCarbs || "0"}g
              </Text>
              <Text style={styles.metricPercentage}>
                {dietInfo?.targetCarbs
                  ? `${Math.min(
                      Math.round(
                        (totalNutrition.carbs /
                          parseInt(dietInfo.targetCarbs.toString())) *
                          100
                      ),
                      100
                    )}%`
                  : "0%"}
              </Text>
            </View>
          </View>
        </View>

        {/* Recommended For You Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended For You</Text>
          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={() =>
              navigation.navigate("RecipeList", {
                recipes: recommendedMeals,
                loading: false,
              })
            }
          >
            <Text style={styles.viewMoreText}>View more</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingLeft: 20 }}
        >
          {loadingRecipes ? (
            <ActivityIndicator color="#fff" />
          ) : (
            recommendedMeals.map((recipe) => {
              const nutrients = recipe.nutrition?.nutrients || [];
              const calories =
                nutrients.find((n: any) => n.name === "Calories")?.amount || 0;
              const protein =
                nutrients.find((n: any) => n.name === "Protein")?.amount || 0;

              return (
                <TouchableOpacity
                  key={recipe.id}
                  style={styles.recipeCard}
                  onPress={() =>
                    navigation.navigate("RecipeDetail", {
                      recipe,
                    })
                  }
                >
                  <Image
                    source={{ uri: recipe.image }}
                    style={styles.recipeImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.recipeTitle} numberOfLines={2}>
                    {recipe.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#666" }}>
                    {Math.round(calories)} kcal · {Math.round(protein)}g protein
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* My Meals Header */}
        <View style={styles.myMealsHeader}>
          <Text style={styles.myMealsTitle}>My Meals</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={{ marginTop: -6 }}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Nutrition Details */}
        <View style={styles.todayNutritionCard}>
          <Text style={styles.todayNutritionTitle}>Today's Nutrition</Text>
          <View style={styles.nutritionRowDetail}>
            <View style={styles.nutritionItemDetail}>
              <Text style={styles.nutritionLabelDetail}>Calories</Text>
              <Text style={styles.nutritionValueDetail}>
                {totalNutrition.calories} kcal
              </Text>
            </View>
            <View style={styles.nutritionItemDetail}>
              <Text style={styles.nutritionLabelDetail}>Protein</Text>
              <Text style={styles.nutritionValueDetail}>
                {totalNutrition.protein}g
              </Text>
            </View>
          </View>
          <View style={styles.nutritionRowDetail}>
            <View style={styles.nutritionItemDetail}>
              <Text style={styles.nutritionLabelDetail}>Carbs</Text>
              <Text style={styles.nutritionValueDetail}>
                {totalNutrition.carbs}g
              </Text>
            </View>
            <View style={styles.nutritionItemDetail}>
              <Text style={styles.nutritionLabelDetail}>Fat</Text>
              <Text style={styles.nutritionValueDetail}>
                {totalNutrition.fat}g
              </Text>
            </View>
          </View>
        </View>

        {/* Meals List */}
        <View style={styles.mealsContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Today's Meals</Text>
          </View>

          {meals.map((meal) => (
            <MealItem key={meal.id} meal={meal} />
          ))}

          {/* Bottom Action Buttons */}
          <View style={styles.mealActionColumn}>
            <TouchableOpacity
              style={styles.mealActionButtonFull}
              onPress={handleAIRecommendations}
            >
              <Ionicons name="bulb" size={18} color="#4CAF50" />
              <Text style={styles.mealActionTextGreen}>
                {hasCompletedSetup ? "AI Recommendations" : "Complete Setup"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mealActionButtonFull}
              onPress={() => {
                setSelectedMealId("breakfast");
                setShowCustomMealModal(true);
              }}
            >
              <Ionicons name="add" size={18} color="#4CAF50" />
              <Text style={styles.mealActionTextGreen}>Add Custom Meal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* AI Recommendation Component */}
      <AIFoodRecommendation
        visible={showAIRecommendations}
        onClose={() => {
          setShowAIRecommendations(false);
          setSelectedMealId(null);
        }}
        onSelectFood={handleSelectFood}
        selectedMealType={selectedMealId || "breakfast"}
      />

      {/* Custom Meal Modal */}
      <Modal
        visible={showCustomMealModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCustomMealModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCustomMealModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Custom Meal</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Meal Name</Text>
              <TextInput
                style={styles.textInput}
                value={customMealData.name}
                onChangeText={(text) =>
                  setCustomMealData((prev) => ({ ...prev, name: text }))
                }
                placeholder="Enter meal name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Calories</Text>
              <TextInput
                style={styles.textInput}
                value={customMealData.calories}
                onChangeText={(text) =>
                  setCustomMealData((prev) => ({ ...prev, calories: text }))
                }
                placeholder="Enter calories"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.nutritionInputs}>
              <View style={styles.inputGroupNutrient}>
                <Text style={styles.inputLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customMealData.protein}
                  onChangeText={(text) =>
                    setCustomMealData((prev) => ({ ...prev, protein: text }))
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroupNutrient}>
                <Text style={styles.inputLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customMealData.carbs}
                  onChangeText={(text) =>
                    setCustomMealData((prev) => ({ ...prev, carbs: text }))
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroupNutrient}>
                <Text style={styles.inputLabel}>Fat (g)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customMealData.fat}
                  onChangeText={(text) =>
                    setCustomMealData((prev) => ({ ...prev, fat: text }))
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.addCustomButton}
              onPress={handleAddCustomMeal}
            >
              <Text style={styles.addCustomButtonText}>Add Meal</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Floating Camera Button */}
      <TouchableOpacity
        style={styles.floatingScanButton}
        onPress={() => navigation.navigate("AiMealPlanner")}
      >
        <MaterialCommunityIcons name="camera" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Date Picker (Platform Specific) */}
      {showDatePicker &&
        (Platform.OS === "ios" ? (
          <Modal
            transparent={true}
            animationType="slide"
            visible={showDatePicker}
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlayDatePicker}>
              <View style={styles.datePickerContainerIOS}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={styles.doneButton}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  textColor="black"
                  onChange={(event, date) => {
                    if (date) {
                      const formattedDate = date.toISOString().split("T")[0];
                      setSelectedDate(date);
                      changeDate(formattedDate);
                    }
                  }}
                  style={{ height: 200 }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                const formattedDate = date.toISOString().split("T")[0];
                setSelectedDate(date);
                changeDate(formattedDate);
              }
            }}
          />
        ))}
    </SafeAreaView>
  );
};

export default MealsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  topNutritionOverview: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  circleMetric: {
    flexDirection: "row",
    alignItems: "center",
    width: "32%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 10,
  },
  circleIcon: {
    width: 36,
    height: 36,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: "#666",
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    flexShrink: 1,
  },
  metricPercentage: {
    fontSize: 12,
    color: "#999",
  },
  myMealsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  todayNutritionCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  todayNutritionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  nutritionRowDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  nutritionItemDetail: {
    flex: 1,
  },
  nutritionLabelDetail: {
    fontSize: 14,
    color: "#666",
  },
  nutritionValueDetail: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  mealsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  mealItem: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  mealTime: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  mealActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  addButton: {
    padding: 4,
  },
  removeButton: {
    padding: 4,
  },
  foodInfo: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  foodName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  nutritionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  nutritionText: {
    fontSize: 12,
    color: "#666",
    marginRight: 12,
    marginBottom: 12,
  },
  emptyMeal: {
    paddingTop: 4,
    alignItems: "flex-start",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#CCC",
  },
  floatingScanButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#8c18ff",
    padding: 12,
    borderRadius: 30,
    elevation: 4,
    zIndex: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f1e3ec",
  },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputGroupNutrient: {
    flex: 1,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  nutritionInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  addCustomButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  addCustomButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  mealActionColumn: {
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 12,
  },
  mealActionButtonFull: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 20,
    paddingVertical: 14,
  },
  mealActionTextGreen: {
    color: "#4CAF50",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  recipeCard: {
    width: 160,
    backgroundColor: "white",
    borderRadius: 16,
    marginRight: 12,
    padding: 10,
    marginBottom: 20,
  },
  recipeImagePlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: "#EEE",
    borderRadius: 12,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
    color: "#333",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewMoreText: {
    color: "#ffffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  myMealsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  headerRight: {
    maxWidth: 200,
    alignItems: "flex-end",
  },
  recipeImage: {
    width: "100%",
    height: 100,
    borderRadius: 12,
    backgroundColor: "#eee",
  },
  modalOverlayDisclaimer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  disclaimerContent: {
    backgroundColor: "#FFD700",
    padding: 25,
    borderRadius: 16,
    width: "85%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  exclamationMark: {
    fontSize: 40,
    marginBottom: 10,
  },
  disclaimerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: 14,
    color: "#000",
    textAlign: "center",
    marginBottom: 20,
  },
  okButton: {
    backgroundColor: "#262135",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  okButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  metricUnit: {
    fontSize: 12,
    color: "#999",
  },
  viewMoreButton: {
    marginTop: -10,
  },
  modalOverlayDatePicker: {
    flex: 1,
    justifyContent: "flex-end",
  },
  datePickerContainerIOS: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  datePickerHeader: {
    width: "100%",
    padding: 16,
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  doneButton: {
    padding: 8,
  },
  doneButtonText: {
    color: "#007AFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
