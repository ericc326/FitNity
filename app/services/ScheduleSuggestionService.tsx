import { db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import moment from "moment";

export type FitnessLevel = "beginner" | "intermediate" | "advanced";

export interface SuggestionResult {
  time: Date;
  fitnessLevel: FitnessLevel;
  reason: string;
}

/**
 * Optimal workout time suggestion based on fitness level and schedule
 */
export const suggestOptimalTime = async (
  userId: string,
  targetDate: Date,
  workoutDuration: number = 60, // Default 60 minutes
  excludeScheduleId?: string
): Promise<SuggestionResult | null> => {
  try {
    const now = moment(); // Current time
    const targetMoment = moment(targetDate);

    // Check if target date is today or in the future
    const isToday = targetMoment.isSame(now, "day");

    // Fetch Fitness Level
    let fitnessLevel: FitnessLevel = "beginner";

    // Read latest health info
    const healthRef = collection(db, "users", userId, "healthinfo");
    const healthSnap = await getDocs(
      query(healthRef, orderBy("createdAt", "desc"), limit(1))
    );

    if (!healthSnap.empty) {
      const data = healthSnap.docs[0].data();
      const levelRaw = (data?.level ?? "").toString().toLowerCase();

      if (["beginner", "intermediate", "advanced"].includes(levelRaw)) {
        fitnessLevel = levelRaw as FitnessLevel;
      }
    }

    console.log(`Detected fitness level: ${fitnessLevel}`);

    // Define Preferred Time Windows
    const preferredWindows = getPreferredWindows(fitnessLevel);

    // Fetch Existing Schedules
    const startOfDay = targetMoment.startOf("day").toDate();
    const endOfDay = targetMoment.endOf("day").toDate();

    const schedulesRef = collection(db, "users", userId, "schedules");
    const q = query(
      schedulesRef,
      where("scheduledAt", ">=", startOfDay),
      where("scheduledAt", "<=", endOfDay),
      orderBy("scheduledAt", "asc")
    );

    const snapshot = await getDocs(q);

    // Map existing schedules and filter out the one being edited and already completed
    const busySlots = snapshot.docs
      .filter((doc) => !excludeScheduleId || doc.id !== excludeScheduleId)
      .filter((doc) => {
        const data = doc.data();
        return data.completed !== true;
      })
      .map((doc) => {
        const data = doc.data();
        const rawDate =
          data.scheduledAt instanceof Timestamp
            ? data.scheduledAt.toDate()
            : data.scheduledAt;

        const start = moment(rawDate);
        const duration = data.duration ?? 60;
        return {
          start: start,
          end: moment(start).add(duration, "minutes"),
        };
      });

    console.log(`Found ${busySlots.length} busy slots`);

    // Find Available Slots in Preferred Windows
    for (const window of preferredWindows) {
      const availableSlot = findFirstAvailableSlotInWindow(
        targetDate,
        window.startHour,
        window.endHour,
        busySlots,
        workoutDuration,
        window.name,
        fitnessLevel,
        isToday ? now : undefined // Pass current time if today
      );

      if (availableSlot) {
        return {
          time: availableSlot.time,
          fitnessLevel,
          reason: availableSlot.reason,
        };
      }
    }

    // Reasonable Hours Fallback
    console.log("No slots in preferred windows, checking reasonable hours");

    // For today, start from current time + 30 minutes
    const startHour = isToday ? Math.max(7, now.hour()) : 7;
    const endHour = 21;

    const reasonableSlot = findFirstAvailableSlotInWindow(
      targetDate,
      startHour,
      endHour,
      busySlots,
      workoutDuration,
      "Reasonable Hours",
      fitnessLevel,
      isToday ? now : undefined
    );

    if (reasonableSlot) {
      return {
        time: reasonableSlot.time,
        fitnessLevel,
        reason: `No preferred time available. ${reasonableSlot.reason}`,
      };
    }

    // Tomorrow Fallback
    if (isToday) {
      console.log("No slots today, checking tomorrow");
      const tomorrow = moment().add(1, "day").toDate();

      // Try tomorrow with preferred windows
      for (const window of preferredWindows) {
        const tomorrowSlot = findFirstAvailableSlotInWindow(
          tomorrow,
          window.startHour,
          window.endHour,
          [], // No busy slots for tomorrow (or fetch them if you want)
          workoutDuration,
          window.name,
          fitnessLevel
        );

        if (tomorrowSlot) {
          return {
            time: tomorrowSlot.time,
            fitnessLevel,
            reason: `No slots available today. Suggested tomorrow: ${tomorrowSlot.reason}`,
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error("ScheduleSuggestionService Error:", error);
    throw new Error("Failed to calculate suggestion");
  }
};

/**
 * Get preferred time windows based on fitness level
 */
const getPreferredWindows = (
  fitnessLevel: FitnessLevel
): Array<{
  name: string;
  startHour: number;
  endHour: number;
}> => {
  switch (fitnessLevel) {
    case "advanced":
      return [
        { name: "Early Morning", startHour: 5, endHour: 8 }, // 5 AM - 8 AM
        { name: "Afternoon", startHour: 14, endHour: 16 }, // 2 PM - 4 PM
        { name: "Evening", startHour: 19, endHour: 21 }, // 7 PM - 9 PM
      ];
    case "intermediate":
      return [
        { name: "Morning", startHour: 7, endHour: 10 }, // 7 AM - 10 AM
        { name: "Lunchtime", startHour: 12, endHour: 14 }, // 12 PM - 2 PM
        { name: "Evening", startHour: 17, endHour: 20 }, // 5 PM - 8 PM
      ];
    case "beginner":
    default:
      return [
        { name: "Late Morning", startHour: 9, endHour: 12 }, // 9 AM - 12 PM
        { name: "Afternoon", startHour: 15, endHour: 18 }, // 3 PM - 6 PM
        { name: "Early Evening", startHour: 18, endHour: 21 }, // 6 PM - 9 PM
      ];
  }
};

/**
 * Find first available slot within a time window
 */
const findFirstAvailableSlotInWindow = (
  targetDate: Date,
  startHour: number,
  endHour: number,
  busySlots: Array<{ start: moment.Moment; end: moment.Moment }>,
  workoutDuration: number,
  windowName: string,
  fitnessLevel: FitnessLevel,
  currentTime?: moment.Moment // Optional: current time to avoid past slots
): { time: Date; reason: string } | null => {
  const slotInterval = 30; // Check every 30 minutes
  const targetMoment = moment(targetDate);

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotInterval) {
      const proposedStart = targetMoment
        .clone()
        .hour(hour)
        .minute(minute)
        .second(0);

      // Skip if this time is in the past (for today)
      if (currentTime && proposedStart.isBefore(currentTime)) {
        continue;
      }

      const proposedEnd = moment(proposedStart).add(workoutDuration, "minutes");

      // Check for conflicts with existing schedules
      const hasConflict = busySlots.some((slot) => {
        return (
          (proposedStart.isSameOrAfter(slot.start) &&
            proposedStart.isBefore(slot.end)) ||
          (proposedEnd.isAfter(slot.start) &&
            proposedEnd.isSameOrBefore(slot.end)) ||
          (proposedStart.isBefore(slot.start) && proposedEnd.isAfter(slot.end))
        );
      });

      if (!hasConflict) {
        // Generate a friendly reason
        const timeStr = proposedStart.format("h:mm A");
        let reason = `${windowName} slot at ${timeStr}`;

        // Check if it's today or future
        const isToday = proposedStart.isSame(moment(), "day");
        const isTomorrow = proposedStart.isSame(moment().add(1, "day"), "day");

        if (isToday) {
          reason += " (Today)";
        } else if (isTomorrow) {
          reason += " (Tomorrow)";
        } else {
          reason += ` (${proposedStart.format("MMM D")})`;
        }

        // Add fitness level specific tips
        if (fitnessLevel === "beginner") {
          reason += " - Great time for learning proper form";
        } else if (fitnessLevel === "intermediate") {
          reason += " - Optimal for strength building";
        } else {
          reason += " - Perfect for high-intensity training";
        }

        return {
          time: proposedStart.toDate(),
          reason,
        };
      }
    }
  }

  return null;
};

// Define the interface so TypeScript knows what 'ScheduleConflict' is
export interface ScheduleConflict {
  start: moment.Moment;
  end: moment.Moment;
  title: string;
}

export interface TimeAvailabilityResult {
  available: boolean;
  conflicts?: ScheduleConflict[];
  nextAvailable?: Date | null;
  message?: string; // Optional message for UI
}

export const checkTimeAvailability = async (
  userId: string,
  proposedTime: Date,
  workoutDuration: number = 60,
  excludeScheduleId?: string
): Promise<TimeAvailabilityResult> => {
  try {
    const proposedStart = moment(proposedTime);
    const proposedEnd = moment(proposedStart).add(workoutDuration, "minutes");
    const now = moment();

    // Add 5-minute buffer
    // If user picks "Now" (e.g. 10:00:00) and hits save at 10:00:10,
    // without this buffer it is technically "in the past".
    // Allow times up to 5 minutes ago to be valid.
    const minimumAllowedTime = moment().subtract(5, "minutes");

    if (proposedStart.isBefore(minimumAllowedTime)) {
      return {
        available: false,
        conflicts: [
          {
            start: proposedStart,
            end: proposedEnd,
            title: "Past Time",
          },
        ],
        nextAvailable: null,
        message: "Cannot schedule in the past",
      };
    }

    // Check schedules for the same day
    const startOfDay = moment(proposedTime).startOf("day").toDate();
    const endOfDay = moment(proposedTime).endOf("day").toDate();

    const schedulesRef = collection(db, "users", userId, "schedules");
    const q = query(
      schedulesRef,
      where("scheduledAt", ">=", startOfDay),
      where("scheduledAt", "<=", endOfDay),
      orderBy("scheduledAt", "asc")
    );

    const snapshot = await getDocs(q);
    const conflicts: ScheduleConflict[] = [];

    snapshot.docs.forEach((doc) => {
      // Skip the schedule being edited
      if (excludeScheduleId && doc.id === excludeScheduleId) {
        return;
      }
      const data = doc.data();

      if (data.completed === true) {
        return;
      }

      const rawDate =
        data.scheduledAt instanceof Timestamp
          ? data.scheduledAt.toDate()
          : data.scheduledAt;

      const start = moment(rawDate);
      const duration = data.duration ?? 60; // Default to 60 minutes if not specified
      const end = moment(start).add(duration, "minutes");

      // Check for overlap
      if (
        (proposedStart.isSameOrAfter(start) && proposedStart.isBefore(end)) ||
        (proposedEnd.isAfter(start) && proposedEnd.isSameOrBefore(end)) ||
        (proposedStart.isBefore(start) && proposedEnd.isAfter(end))
      ) {
        conflicts.push({
          start,
          end,
          title: data.title || "Scheduled Activity",
        });
      }
    });

    if (conflicts.length === 0) {
      return {
        available: true,
        message: "Time slot is available",
      };
    }

    // Find next available time
    const nextAvailable = findNextAvailableTime(
      proposedTime,
      conflicts,
      workoutDuration
    );

    return {
      available: false,
      conflicts,
      nextAvailable,
      message: `Time conflict with "${conflicts[0]?.title}"`,
    };
  } catch (error) {
    console.error("CheckTimeAvailability Error:", error);
    throw new Error("Failed to check time availability");
  }
};

/**
 * Find next available time after conflicts
 */
const findNextAvailableTime = (
  proposedTime: Date,
  conflicts: ScheduleConflict[],
  workoutDuration: number
): Date | undefined => {
  const now = moment();

  // Start checking from the proposed time (or now if proposed time is in the past)
  let startTime = moment.max(moment(proposedTime), now);

  // Sort conflicts by start time
  const sortedConflicts = [...conflicts].sort(
    (a, b) => a.start.valueOf() - b.start.valueOf()
  );

  // Check up to 48 times (24 hours * every 30 minutes)
  for (let i = 0; i < 48; i++) {
    const checkTime = startTime.clone().add(i * 30, "minutes");
    const checkEnd = checkTime.clone().add(workoutDuration, "minutes");

    // Skip unreasonable hours (11 PM to 5 AM)
    const hour = checkTime.hour();
    if (hour >= 23 || hour < 5) {
      continue;
    }

    const hasConflict = sortedConflicts.some((conflict) => {
      return (
        (checkTime.isSameOrAfter(conflict.start) &&
          checkTime.isBefore(conflict.end)) ||
        (checkEnd.isAfter(conflict.start) &&
          checkEnd.isSameOrBefore(conflict.end)) ||
        (checkTime.isBefore(conflict.start) && checkEnd.isAfter(conflict.end))
      );
    });

    if (!hasConflict) {
      return checkTime.toDate();
    }
  }

  return undefined;
};
