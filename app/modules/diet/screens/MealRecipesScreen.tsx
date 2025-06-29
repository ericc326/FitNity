import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { DietStackParamList } from "../navigation/DietNavigator";
import { FoodItem } from "../navigation/DietNavigator";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type MealRecipesNavigationProp = NativeStackNavigationProp<
  DietStackParamList,
  "MealRecipes"
>;
type MealRecipesRouteProp = RouteProp<DietStackParamList, "MealRecipes">;

type Props = {
  route: MealRecipesRouteProp;
};

const MealRecipesScreen = ({ route }: Props) => {
  const navigation = useNavigation<MealRecipesNavigationProp>();
  const { mealType } = route.params;

  // Mock data - all using pancake.png image
  const allRecipes: FoodItem[] = [
    {
      id: "1",
      name: "Honey Pancake",
      type: "Breakfast",
      tags: ["Easy", "Baked"],
      description: "Fluffy pancakes with real honey drizzle and fresh berries.",
      ingredients: [
        "1 cup all-purpose flour",
        "2 tbsp sugar",
        "2 tsp baking powder",
        "1/2 tsp salt",
        "1 cup milk",
        "1 egg",
        "2 tbsp honey",
        "Fresh berries for topping",
      ],
      image: require("../../../assets/pancake.png"),
      nutrition: {
        protein: "12g",
        calories: "350kcal",
        fat: "10g",
        carbs: "45g",
      },
    },
    {
      id: "2",
      name: "Blueberry Pancake",
      type: "Breakfast",
      tags: ["Fruity", "Healthy"],
      description:
        "Classic pancakes with fresh blueberries mixed in the batter.",
      ingredients: [
        "1 cup all-purpose flour",
        "1 tbsp sugar",
        "2 tsp baking powder",
        "1/2 cup blueberries",
        "1 cup milk",
        "1 egg",
      ],
      image: require("../../../assets/pancake.png"),
      nutrition: {
        protein: "10g",
        calories: "200kcal",
        fat: "8g",
        carbs: "30g",
      },
    },
    {
      id: "3",
      name: "Chocolate Pancake",
      type: "Breakfast",
      tags: ["Sweet", "Decadent"],
      description: "Rich chocolate pancakes with chocolate chips.",
      ingredients: [
        "1 cup all-purpose flour",
        "2 tbsp cocoa powder",
        "3 tbsp sugar",
        "1/2 cup chocolate chips",
        "1 cup milk",
        "1 egg",
      ],
      image: require("../../../assets/pancake.png"),
      nutrition: {
        protein: "8g",
        calories: "250kcal",
        fat: "12g",
        carbs: "35g",
      },
    },
  ];

  const filteredRecipes = allRecipes.filter(
    (recipe) => recipe.type === mealType
  );

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <FlatList
        data={filteredRecipes}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.recipeItem}
            onPress={() => navigation.navigate("FoodDetails", { food: item })}
          >
            <Image source={item.image} style={styles.recipeImage} />
            <View style={styles.recipeInfo}>
              <Text style={styles.recipeName}>{item.name}</Text>
              <Text style={styles.recipeDescription}>{item.description}</Text>
              <View style={styles.recipeMeta}></View>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#262135",
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 16,
  },
  listContent: {
    padding: 16,
  },
  recipeItem: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  recipeImage: {
    width: 100,
    height: 100,
  },
  recipeInfo: {
    flex: 1,
    padding: 12,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 14,
    color: "#CCCCCC",
    marginBottom: 8,
  },
  recipeMeta: {
    flexDirection: "row",
  },
  recipeTime: {
    fontSize: 12,
    color: "#5A3BFF",
    marginRight: 12,
  },
  recipeCalories: {
    fontSize: 12,
    color: "#5A3BFF",
  },
});

export default MealRecipesScreen;
