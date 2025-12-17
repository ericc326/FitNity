import React from "react";
import { View, Text, Image, StyleSheet, ScrollView } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { DietStackParamList } from "../navigation/DietNavigator";

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
    <ScrollView style={styles.container}>
      <Image source={{ uri: recipe.image }} style={styles.image} />

      <Text style={styles.title}>{recipe.title}</Text>

      <View style={styles.card}>
        <Text>🔥 Calories: {getNutrient("Calories")} kcal</Text>
        <Text>🥩 Protein: {getNutrient("Protein")} g</Text>
        <Text>🍞 Carbs: {getNutrient("Carbohydrates")} g</Text>
        <Text>🥑 Fat: {getNutrient("Fat")} g</Text>
      </View>
    </ScrollView>
  );
};

export default RecipeDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  image: { width: "100%", height: 220 },
  title: { fontSize: 22, fontWeight: "bold", padding: 16 },
  card: {
    margin: 16,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    gap: 8,
  },
});
