import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SplashScreen from "../screens/SplashScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import OnboardingGenderScreen from "../screens/OnboardingGenderScreen";
import OnboardingBodyScreen from "../screens/OnboardingBodyScreen";
import OnboardingHealthScreen from "../screens/OnboardingHealthScreen";
import OnboardingLevelScreen from "../screens/OnboardingLevelScreen";

export type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  OnboardingGender: undefined;
  OnboardingBody: { gender: string };
  OnboardingLevel: { gender: string; weight: string; height: string };
  OnboardingHealth: {
    gender: string;
    weight: string;
    height: string;
    level: string;
    goal: string;
  };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />
      <AuthStack.Screen
        name="OnboardingGender"
        component={OnboardingGenderScreen}
      />
      <AuthStack.Screen
        name="OnboardingBody"
        component={OnboardingBodyScreen}
      />
      <AuthStack.Screen
        name="OnboardingLevel"
        component={OnboardingLevelScreen}
      />
      <AuthStack.Screen
        name="OnboardingHealth"
        component={OnboardingHealthScreen}
      />
    </AuthStack.Navigator>
  );
};

export default AuthNavigator;
