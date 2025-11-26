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
const REMINDER_OFFSET_MIN_KEY = "fitnity_reminder_offset_min"; // default 5 min

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

export async function getReminderOffsetMinutes(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(REMINDER_OFFSET_MIN_KEY);
    const n = value != null ? Number(value) : 5;
    return Number.isFinite(n) && n >= 0 ? n : 5;
  } catch {
    return 5;
  }
}

export async function setReminderOffsetMinutes(min: number) {
  try {
    const n = Number.isFinite(min) && min >= 0 ? Math.round(min) : 5;
    await AsyncStorage.setItem(REMINDER_OFFSET_MIN_KEY, String(n));
  } catch {}
}

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
  title: string,
  options?: { skipIfPassed?: boolean }
): Promise<string | null> {
  const isEnabled = await getNotificationPreference();
  if (!isEnabled) {
    console.log("Notification skipped: User has disabled notifications.");
    return null;
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;

  const hasPermission = await ensureNotificationPermissions();
  if (!hasPermission) return null;

  try {
    const offsetMin = await getReminderOffsetMinutes();
    const offsetMs = offsetMin * 60 * 1000;
    const reminderAt = new Date(date.getTime() - offsetMs);
    const now = new Date();

    // 1. Grace period check:
    // If workout passed more than 60 seconds ago, skip it.
    // (Using strictly "now" might fail if user takes 1 second to click save)
    if (date.getTime() <= now.getTime() - 60 * 1000) {
      console.log("Skip scheduling: workout time already passed.");
      return null;
    }

    let target: Date;

    if (reminderAt.getTime() > now.getTime()) {
      // Normal case: Reminder is in the future
      target = reminderAt;
    } else {
      // Offset passed.
      // If we are strictly rescheduling (e.g. settings change), do NOT fire a late notification.
      if (options?.skipIfPassed) {
        console.log("Skipping past reminder during reschedule.");
        return null;
      }

      // Catch-up mode (only for new/edited schedules created "now")
      // We set this slightly in the future so iOS creates the ID successfully.
      target = new Date(now.getTime() + 2000);
    }

    // 2. CRITICAL SAFETY CHECK for iOS
    // Ensure the final target is strictly in the future relative to the *exact* moment of scheduling.
    const strictNow = new Date().getTime();
    if (target.getTime() <= strictNow + 1000) {
      // If it's too close or passed, push it forward
      target = new Date(strictNow + 2000);
    }

    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: target.getTime(),
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

    // Cancel the old pending reminder
    const oldId =
      typeof data.notificationId === "string" ? data.notificationId : null;
    await cancelReminder(oldId);

    // Always schedule from the original schedule time; service applies latest offset
    const when: Date = data.scheduledAt?.toDate
      ? data.scheduledAt.toDate()
      : new Date(data.scheduledAt);
    const title =
      (data.title as string) ||
      (data.selectedWorkoutName as string) ||
      "Workout";
    const newId = await scheduleWorkoutReminder(when, title, {
      skipIfPassed: true,
    });
    await updateDoc(doc(db, "users", uid, "schedules", docSnap.id), {
      notificationId: newId ?? null,
    });
  }
}
