import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "../screens/ProfileScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PersonalInformationScreen from "../screens/PersonalInformationScreen";
import AchievementsScreen from "../screens/AchievementsScreen";

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  PersonalInformation: undefined;
  Achievements: undefined;
  Settings: undefined;
};

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileNavigator = () => {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen
        name="PersonalInformation"
        component={PersonalInformationScreen}
      />
      <ProfileStack.Screen name="Achievements" component={AchievementsScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    </ProfileStack.Navigator>
  );
};

export default ProfileNavigator;
