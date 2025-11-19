import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

const PUSH_ENABLED_KEY = "fitnity_push_enabled";

// SETUP GLOBAL HANDLER
// Without this, notifications won't appear if the user has the app OPEN.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    // Android (still respected) + backward compat
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function getNotificationPreference(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(PUSH_ENABLED_KEY);
    // If null (first time user), return true (Default Open)
    return value === null ? true : JSON.parse(value);
  } catch (e) {
    return true; // Default to true on error
  }
}

export async function setNotificationPreference(enabled: boolean) {
  try {
    await AsyncStorage.setItem(PUSH_ENABLED_KEY, JSON.stringify(enabled));

    // If user turns OFF notifications, cancel all pending ones immediately
    if (!enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("Notifications disabled: All pending schedules canceled.");
    }
  } catch (e) {
    console.error("Error saving notification preference", e);
  }
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log("Must use physical device for Push Notifications");
    return true;
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Workout Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return status === "granted";
}

export async function scheduleWorkoutReminder(
  date: Date,
  title: string
): Promise<string | null> {
  const isEnabled = await getNotificationPreference();
  if (!isEnabled) {
    console.log("Notification skipped: User has disabled notifications.");
    return null;
  }
  if (!(date instanceof Date) || isNaN(date.getTime()) || date <= new Date()) {
    console.warn("Cannot schedule notification in the past");
    return null;
  }
  const hasPermission = await ensureNotificationPermissions();
  if (!hasPermission) return null;

  try {
    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: date.getTime(),
      channelId: Platform.OS === "android" ? "reminders" : undefined,
    };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Workout Reminder",
        body: title
          ? `${title} is starting soon.`
          : "Your workout is starting.",
        sound: "default",
        data: { kind: "workout-reminder" },
      },
      trigger,
    });
    return id;
  } catch (e) {
    console.error("Error scheduling notification", e);
    return null;
  }
}

export async function cancelReminder(notificationId?: string | null) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`Canceled notification: ${notificationId}`);
  } catch (e) {
    console.log("Error canceling notification", e);
  }
}

// Re-schedule all future schedules for the signed-in user (after re-enabling push)
export async function rescheduleUpcomingReminders() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const nowTs = Timestamp.fromDate(new Date());
  const qRef = query(
    collection(db, "users", uid, "schedules"),
    where("completed", "==", false),
    where("scheduledAt", ">=", nowTs),
    orderBy("scheduledAt", "asc")
  );
  const snap = await getDocs(qRef);
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as any;
    const when: Date = data.scheduledAt?.toDate
      ? data.scheduledAt.toDate()
      : new Date(data.scheduledAt);
    const fiveMinBefore = new Date(when.getTime() - 5 * 60 * 1000);
    const fireAt = fiveMinBefore > new Date() ? fiveMinBefore : when;
    const title =
      (data.title as string) ||
      (data.selectedWorkoutName as string) ||
      "Workout";
    const id = await scheduleWorkoutReminder(fireAt, title);
    await updateDoc(doc(db, "users", uid, "schedules", docSnap.id), {
      notificationId: id ?? null,
    });
  }
}
