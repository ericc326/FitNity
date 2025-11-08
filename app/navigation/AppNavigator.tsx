import React from "react";
import { NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import AuthNavigator, {
  AuthStackParamList,
} from "../modules/auth/navigation/AuthNavigator";
import HomeScreen from "../modules/home/screens/HomeScreen";
import WorkoutScreen from "../modules/workout/screens/WorkoutScreen";
import DietScreen from "../modules/diet/screens/DietScreen";
import CommunityScreen from "../modules/community/screens/CommunityScreen";
import StatisticScreen from "../modules/statistics/screens/StatisticScreen";
import ProfileNavigator from "../modules/profile/navigation/ProfileNavigator";
import DietNavigator, {
  DietStackParamList,
} from "../modules/diet/navigation/DietNavigator";
import ScheduleNavigator, {
  ScheduleStackParamList,
} from "../modules/schedule/navigation/ScheduleNavigator";
import WorkoutNavigator, {
  WorkoutStackParamList,
} from "../modules/workout/navigation/WorkoutNavigator";
import AiCoachScreen from "../modules/workout/screens/AiCoachScreen";

// Tab Navigation Types
export type HomeTabParamList = {
  Home: undefined; // Home shouldn't have nested navigator params
  Schedule: NavigatorScreenParams<ScheduleStackParamList>;
  Workout: NavigatorScreenParams<WorkoutStackParamList>; // Fixed to use WorkoutStackParamList
  Diet: NavigatorScreenParams<DietStackParamList>;
  Community: undefined;
};

// Root Navigation Types
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  HomeTab: NavigatorScreenParams<HomeTabParamList>;
  Statistic: undefined;
  Profile: undefined;
  AiCoach: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<HomeTabParamList>();

// Bottom Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#5A556B",
          borderTopWidth: 0,
          height: 80,
        },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "rgba(44,38,58,0.38)",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("Schedule", { screen: "ScheduleList" });
          },
        })}
      />
      <Tab.Screen
        name="Workout"
        component={WorkoutNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dumbbell" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Diet"
        component={DietNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="food-apple"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-group"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
export default function AppNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Auth"
    >
      <RootStack.Screen name="Auth" component={AuthNavigator} />
      <RootStack.Screen name="HomeTab" component={TabNavigator} />
      <RootStack.Screen
        name="Statistic"
        component={StatisticScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ headerShown: false }}
      />
      <RootStack.Screen name="AiCoach" component={AiCoachScreen} />
    </RootStack.Navigator>
  );
}
