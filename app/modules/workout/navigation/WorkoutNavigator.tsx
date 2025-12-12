import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import WorkoutScreen from "../screens/WorkoutScreen";
import WorkoutSection from "../screens/WorkoutSection";
import SelectExercise from "../screens/SelectExercise";
import FilterExercise from "../screens/FilterExercise";
import HomeScreen from "../../home/screens/HomeScreen";
import AiCoachScreen from "../screens/AiCoachScreen";
import WorkoutOverviewScreen from "../screens/WorkoutOverviewScreen";
import RecommendationWorkoutScreen from "../screens/RecommendationWorkoutScreen";

export type WorkoutStackParamList = {
  WorkoutMain: undefined;
  WorkoutSection:
    | {
        selectedExercise?: string;
        selectedExercises?: string[];
      }
    | undefined;
  SelectExercise: { fromHome?: boolean } | undefined;
  FilterExercise: undefined;
  HomeScreen: undefined;
  AiCoach: undefined;
  WorkoutOverview: {
    workout: any;
    level?: "Beginner" | "Intermediate" | "Advanced"; // optional for flexibility
  };
  RecommendationWorkout: {
    workout: any;
    level: string;
  };
};

const Stack = createNativeStackNavigator<WorkoutStackParamList>();

const WorkoutNavigator: React.FC = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, { resetToMain?: boolean }>, string>>();

  /**
   * Automatically reset navigation to WorkoutMain if resetToMain param is passed
   */
  useEffect(() => {
    if (route.params?.resetToMain) {
      navigation.reset({
        index: 0,
        routes: [{ name: "WorkoutMain" as never }],
      });
    }
  }, [route, navigation]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
      initialRouteName="WorkoutMain"
    >
      {/* Main Workout Screens */}
      <Stack.Screen name="WorkoutMain" component={WorkoutScreen} />
      <Stack.Screen name="WorkoutSection" component={WorkoutSection} />
      <Stack.Screen name="SelectExercise" component={SelectExercise} />
      <Stack.Screen name="FilterExercise" component={FilterExercise} />

      {/* Integration with Home + AI */}
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="AiCoach" component={AiCoachScreen} />

      {/* Suggested Workout Flow */}
      <Stack.Screen name="WorkoutOverview" component={WorkoutOverviewScreen} />
      <Stack.Screen
        name="RecommendationWorkout"
        component={RecommendationWorkoutScreen}
      />
    </Stack.Navigator>
  );
};

export default WorkoutNavigator;
