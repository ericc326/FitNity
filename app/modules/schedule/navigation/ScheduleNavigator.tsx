import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ScheduleScreen from "../screens/ScheduleScreen";
import CreateScheduleScreen from "../screens/CreateScheduleScreen";
import EditScheduleScreen from "../screens/EditScheduleScreen";
import ScheduleDetailScreen from "../screens/ScheduleDetailScreen";

export type ScheduleStackParamList = {
  ScheduleList: undefined;
  ScheduleDetail: { scheduleId: string; fromHome?: boolean };
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
        name="ScheduleDetail"
        component={ScheduleDetailScreen}
      />
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
