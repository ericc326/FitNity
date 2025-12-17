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
        const res = await fetch(
          `https://api.spoonacular.com/recipes/complexSearch?` +
            `apiKey=${process.env.SPOONACULAR_API_KEY}` +
            `&number=50` + // Fetch more recipes for the library
            `&addRecipeNutrition=true`
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

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {recipes.map((recipe) => {
        const nutrients = recipe.nutrition?.nutrients || [];
        const calories =
          nutrients.find(
            (n: { name: string; amount: number }) => n.name === "Calories"
          )?.amount || 0;
        const protein =
          nutrients.find(
            (n: { name: string; amount: number }) => n.name === "Protein"
          )?.amount || 0;

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
            <Text style={styles.recipeTitle} numberOfLines={2}>
              {recipe.title}
            </Text>
            <Text style={styles.recipeInfo}>
              {Math.round(calories)} kcal · {Math.round(protein)}g protein
            </Text>
          </TouchableOpacity>
        );
      })}
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
    backgroundColor: "#333",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  recipeImage: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    backgroundColor: "#555",
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
    color: "#fff",
  },
  recipeInfo: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 4,
  },
});

export default RecipeList;
