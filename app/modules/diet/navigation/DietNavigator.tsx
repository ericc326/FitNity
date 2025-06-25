import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DietScreen from "../screens/DietScreen";
import FoodDetailsScreen from "../screens/FoodDetailsScreen";
import FoodScannerScreen from "../screens/FoodScannerScreen";
import MealRecipesScreen from "../screens/MealRecipesScreen"; // Import the new screen

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
  MealRecipes: { mealType: string }; // Add the new route with params
};

const DietStack = createNativeStackNavigator<DietStackParamList>();

const DietNavigator: React.FC = () => {
  return (
    <DietStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <DietStack.Screen 
        name="DietHome" 
        component={DietScreen}
      />
      
      <DietStack.Screen 
        name="FoodDetails" 
        component={FoodDetailsScreen}
        options={{
          headerShown: true,
          title: "Food Details",
          headerBackTitle: "Back",
        }}
      />
      
      <DietStack.Screen 
        name="FoodScanner" 
        component={FoodScannerScreen}
        options={{
          headerShown: true,
          title: "Scan Food",
          presentation: "modal",
        }}
      />
      
      <DietStack.Screen 
        name="MealRecipes" 
        component={MealRecipesScreen}
        options={{
          headerShown: true,
          title: "Meal Recipes",
          headerBackTitle: "Back",
        }}
      />
    </DietStack.Navigator>
  );
};

export default DietNavigator;