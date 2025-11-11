import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ScheduleScreen from "../screens/ScheduleScreen"; // Import ScheduleStackParamList
import CreateScheduleScreen from "../screens/CreateScheduleScreen"; // Import the new screen
import EditScheduleScreen from "../screens/EditScheduleScreen";

export type ScheduleStackParamList = {
  ScheduleList: undefined;
  CreateSchedule:
    | { fromHome?: boolean; resetKey?: number; selectedExercises?: string[] }
    | { scheduleId: string }
    | undefined;
  EditSchedule: { scheduleId: string };
};

const ScheduleStack = createNativeStackNavigator<ScheduleStackParamList>();

const ScheduleNavigator = () => {
  return (
    <ScheduleStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ScheduleStack.Screen name="ScheduleList" component={ScheduleScreen} />
      <ScheduleStack.Screen
        name="CreateSchedule"
        component={CreateScheduleScreen}
      />
      <ScheduleStack.Screen
        name="EditSchedule"
        component={EditScheduleScreen}
      />
    </ScheduleStack.Navigator>
  );
};

export default ScheduleNavigator;
