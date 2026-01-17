import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DietScreen from "../screens/DietScreen";
import AiMealPlanner from "../screens/AiFoodScanner";
import RecipeDetailScreen from "../screens/RecipeDetailScreen";
import RecipeList, { Recipe } from "../screens/RecipeList";

// Define the FoodItem type
export type FoodItem = {
  id: string;
  name: string;
  type: string;
  tags: string[];
  description: string;
  ingredients: string[];
  image: any;
  nutrition: {
    protein: string;
    calories: string;
    fat: string;
    carbs: string;
  };
};

// Define the parameter types for the Diet stack navigation
export type DietStackParamList = {
  DietHome: undefined;
  FoodDetails: { food: FoodItem };
  FoodScanner: undefined;
  MealRecipes: { mealType: string };
  AiMealPlanner: undefined;
  RecipeList: { recipes: Recipe[]; loading?: boolean };
  RecipeDetail: { recipe: any };
};

const DietStack = createNativeStackNavigator<DietStackParamList>();

const DietNavigator: React.FC = () => {
  return (
    <DietStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <DietStack.Screen name="DietHome" component={DietScreen} />

      <DietStack.Screen
        name="AiMealPlanner"
        component={AiMealPlanner}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: "#262135" },
          headerTintColor: "#fff",
          title: "AI Food Scanner",
          headerBackTitle: "Back",
        }}
      />

      <DietStack.Screen
        name="RecipeList"
        component={RecipeList}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: "#262135" },
          headerTintColor: "#fff",
          title: "All Recipes",
          headerBackTitle: "Back",
        }}
      />

      <DietStack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    </DietStack.Navigator>
  );
};

export default DietNavigator;
