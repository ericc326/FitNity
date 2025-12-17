import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./app/navigation/AppNavigator";
import { MealPlanProvider } from "./app/modules/diet/component/MealPlanContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <MealPlanProvider>
        <StatusBar style="auto" />
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </MealPlanProvider>
    </SafeAreaProvider>
  );
}
