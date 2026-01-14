import React, { useEffect, useState } from "react";
import {
  ScrollView,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { DietStackParamList } from "../navigation/DietNavigator";
import { SPOONACULAR_API_KEY } from "@env";
// Added Ionicons for better UI visualization
import { Ionicons } from "@expo/vector-icons";

// Recipe & Nutrient types
export interface Recipe {
  id: number;
  title: string;
  image?: string;
  nutrition?: {
    nutrients?: { name: string; amount: number }[];
  };
}

type Props = NativeStackScreenProps<DietStackParamList, "RecipeList">;

const RecipeList = ({ navigation }: Props) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllRecipes = async () => {
      setLoading(true);
      try {
        // --- FIXED URL HERE ---
        // Added: &addRecipeNutrition=true
        // This ensures Spoonacular sends Fat and Carbs data
        const res = await fetch(
          `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_API_KEY}&number=50&minProtein=10&addRecipeInformation=true&addRecipeNutrition=true&fillIngredients=true&instructionsRequired=true`
        );
        const data = await res.json();
        setRecipes(data.results || []);
      } catch (error) {
        console.error("Spoonacular error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllRecipes();
  }, []);

  // Helper function to extract nutrients cleanly
  const getNutrient = (nutrients: any[], name: string) => {
    // Note: Spoonacular uses "Carbohydrates", not "Carbs"
    const n = nutrients?.find((item: any) => item.name === name);
    return n ? Math.round(n.amount) : 0;
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {recipes.map((recipe) => {
        const nutrients = recipe.nutrition?.nutrients || [];

        // Extract all 4 macros
        const calories = getNutrient(nutrients, "Calories");
        const protein = getNutrient(nutrients, "Protein");
        const carbs = getNutrient(nutrients, "Carbohydrates");
        const fat = getNutrient(nutrients, "Fat");

        return (
          <TouchableOpacity
            key={recipe.id}
            style={styles.recipeCard}
            onPress={() => navigation.navigate("RecipeDetail", { recipe })}
          >
            <Image
              source={{ uri: recipe.image }}
              style={styles.recipeImage}
              resizeMode="cover"
            />
            <View style={styles.contentContainer}>
              <Text style={styles.recipeTitle} numberOfLines={2}>
                {recipe.title}
              </Text>

              {/* Nutrition Badges Row */}
              <View style={styles.nutritionRow}>
                <View style={styles.nutrientBadge}>
                  <Ionicons name="flame" size={12} color="#FF5722" />
                  <Text style={styles.nutrientText}>{calories} kcal</Text>
                </View>
                <View style={styles.nutrientBadge}>
                  <Ionicons name="restaurant" size={12} color="#4CAF50" />
                  <Text style={styles.nutrientText}>{protein}g P</Text>
                </View>
                <View style={styles.nutrientBadge}>
                  <Ionicons name="leaf" size={12} color="#2196F3" />
                  <Text style={styles.nutrientText}>{carbs}g C</Text>
                </View>
                <View style={styles.nutrientBadge}>
                  <Ionicons name="water" size={12} color="#FFC107" />
                  <Text style={styles.nutrientText}>{fat}g F</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
      {/* Padding at bottom for scrolling */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#262135",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#262135",
  },
  recipeCard: {
    backgroundColor: "#3C3952", // Slightly lighter than background
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden", // Ensures image corners align with card
  },
  recipeImage: {
    width: "100%",
    height: 150,
    backgroundColor: "#555",
  },
  contentContainer: {
    padding: 12,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  // New Styles for the Badge layout
  nutritionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  nutrientBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)", // Glassmorphism effect
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  nutrientText: {
    color: "#ddd",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default RecipeList;
