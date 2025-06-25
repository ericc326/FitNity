import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WorkoutScreen from "../screens/WorkoutScreen"; // Your original screen
import WorkoutSection from "../screens/WorkoutSection"; // Create workout flow
import SelectExercise from "../screens/SelectExercise";
import FilterExercise from "../screens/FilterExercise";
import HomeScreen from "../../home/screens/HomeScreen"; 
import AiCoachScreen from "../screens/AiCoachScreen";

export type WorkoutStackParamList = {
  WorkoutMain: undefined;      // Your original screen
  WorkoutSection: undefined | {  // Make entire params optional
    selectedExercise?: string;
    selectedExercises?: string[];
  };
  SelectExercise: undefined;
  FilterExercise: undefined;
  HomeScreen: undefined;
  AiCoach: undefined;
};

const WorkoutStack = createNativeStackNavigator<WorkoutStackParamList>();

const WorkoutNavigator = () => {
  return (
    <WorkoutStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
      initialRouteName="WorkoutMain"  // Show WorkoutScreen first
    >
      {/* Main Workout Screen */}
      <WorkoutStack.Screen 
        name="WorkoutMain" 
        component={WorkoutScreen} 
      />
      
      {/* Create Workout Flow */}
      <WorkoutStack.Screen name="WorkoutSection" component={WorkoutSection} />
      <WorkoutStack.Screen name="SelectExercise" component={SelectExercise} />
      <WorkoutStack.Screen name="FilterExercise" component={FilterExercise} />
      <WorkoutStack.Screen name="HomeScreen" component={HomeScreen} />
       <WorkoutStack.Screen name="AiCoach" component={AiCoachScreen} />
    </WorkoutStack.Navigator>
  );
};

export default WorkoutNavigator;