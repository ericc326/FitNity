import React from "react";
import { NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import SplashScreen from "../screens/SplashScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";

import HomeScreen from "../screens/HomeScreen";
import ScheduleScreen from "../screens/ScheduleScreen";
import WorkoutScreen from "../screens/WorkoutScreen";
import DietScreen from "../screens/DietScreen";
import CommunityScreen from "../screens/CommunityScreen";

export type HomeTabParamList = {
  Home: undefined;
  Schedule: undefined;
  Workout: undefined;
  Diet: undefined;
  Community: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Main: NavigatorScreenParams<HomeTabParamList>;
};

const Tab = createBottomTabNavigator<HomeTabParamList>();
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#5A556B" }, // tab bar background
        tabBarActiveTintColor: "#fff", // active icon/text color
        tabBarInactiveTintColor: "rgba(44,38,58,0.38)",
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Workout" component={WorkoutScreen} />
      <Tab.Screen name="Diet" component={DietScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
    </Tab.Navigator>
  );
}

const RootStack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Splash" component={SplashScreen} />
      <RootStack.Screen name="Welcome" component={WelcomeScreen} />
      <RootStack.Screen name="Login" component={LoginScreen} />
      <RootStack.Screen name="Register" component={RegisterScreen} />
      <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <RootStack.Screen name="Main" component={MainTabs} />
    </RootStack.Navigator>
  );
}
