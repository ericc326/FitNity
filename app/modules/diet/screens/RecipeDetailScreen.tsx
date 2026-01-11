import React from "react";
import { View, Text, Image, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp } from "@react-navigation/native";
import { DietStackParamList } from "../navigation/DietNavigator";
import { Ionicons } from "@expo/vector-icons"; // Added for better icons if needed

type RecipeDetailRouteProp = RouteProp<DietStackParamList, "RecipeDetail">;

type Props = {
  route: RecipeDetailRouteProp;
};

const RecipeDetailScreen = ({ route }: Props) => {
  const { recipe } = route.params;

  const nutrients = recipe.nutrition?.nutrients || [];

  const getNutrient = (name: string) =>
    Math.round(nutrients.find((n: any) => n.name === name)?.amount || 0);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView style={styles.scrollView}>
        <Image source={{ uri: recipe.image }} style={styles.image} />

        <Text style={styles.title}>{recipe.title}</Text>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Nutrition Facts</Text>
          <View style={styles.nutrientRow}>
            <Text style={styles.nutrientText}>🔥 Calories</Text>
            <Text style={styles.nutrientValue}>
              {getNutrient("Calories")} kcal
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.nutrientRow}>
            <Text style={styles.nutrientText}>🥩 Protein</Text>
            <Text style={styles.nutrientValue}>{getNutrient("Protein")} g</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.nutrientRow}>
            <Text style={styles.nutrientText}>🍞 Carbs</Text>
            <Text style={styles.nutrientValue}>
              {getNutrient("Carbohydrates")} g
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.nutrientRow}>
            <Text style={styles.nutrientText}>🥑 Fat</Text>
            <Text style={styles.nutrientValue}>{getNutrient("Fat")} g</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RecipeDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135", // Main background
  },
  scrollView: {
    flex: 1,
  },
  image: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 20,
    color: "#fff", // White text for dark background
  },
  card: {
    margin: 16,
    padding: 20,
    backgroundColor: "#3C3952", // Darker card surface color to match theme
    borderRadius: 16,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
  },
  nutrientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  nutrientText: {
    fontSize: 16,
    color: "#bfb9d6", // Softer light purple/gray for labels
  },
  nutrientValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff", // Bright white for values
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)", // Subtle divider
    marginVertical: 4,
  },
});
