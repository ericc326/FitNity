import React, { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  AlertButton,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScheduleStackParamList } from "../navigation/ScheduleNavigator";
import { auth, db } from "../../../../firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import moment from "moment";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import LoadingIndicator from "../../../components/LoadingIndicator";
import { cancelReminder } from "../../../services/NotificationService";

type Props = NativeStackScreenProps<ScheduleStackParamList, "ScheduleDetail">;

type ScheduleDoc = {
  id: string;
  title?: string;
  scheduledAt?: Timestamp | Date;
  selectedWorkoutName?: string;
  selectedWorkoutId?: string;
  customSets?: number | null;
  customReps?: number | null;
  customRestSeconds?: number | null;
  customLabel?: string | null;
  completed?: boolean;
  [k: string]: any;
};

type ExerciseDoc = {
  id: string;
  name?: string;
  bodyParts?: string[];
  bodyPart?: string;
  equipments?: string[];
  equipment?: string;
  instructions?: string[];
  gifUrl?: string;
  [k: string]: any;
};

const StatBox = ({
  icon,
  value,
  label,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string;
  label: string;
}) => (
  <View style={styles.statBox}>
    <MaterialCommunityIcons name={icon} size={24} color="#89b1ff" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Tag = ({ text }: { text: string }) => (
  <View style={styles.tag}>
    <Text style={styles.tagText}>{text}</Text>
  </View>
);

export default function ScheduleDetailScreen({ route, navigation }: Props) {
  const { scheduleId } = route.params;
  const { fromHome } = route.params;
  const [data, setData] = useState<ScheduleDoc | null>(null);
  const [exercise, setExercise] = useState<ExerciseDoc | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchSchedule = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // fetch schedule
    const ref = doc(db, `users/${uid}/schedules/${scheduleId}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const schedule: ScheduleDoc = { id: snap.id, ...(snap.data() as any) };
    setData(schedule);

    // always refresh exercise details based on the latest selectedWorkoutId
    const exerciseId = schedule.selectedWorkoutId;
    if (exerciseId) {
      setExercise(null); // avoid showing stale exercise briefly
      const exSnap = await getDoc(doc(db, "exercises", exerciseId));
      if (exSnap.exists()) {
        const exerciseFound: ExerciseDoc = {
          id: exSnap.id,
          ...(exSnap.data() as any),
        };
        setExercise(exerciseFound);
      } else {
        setExercise(null);
      }
    } else {
      setExercise(null);
    }
  }, [scheduleId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          if (active) await fetchSchedule();
        } catch {
          // no-op
        }
      })();
      return () => {
        active = false;
      };
    }, [fetchSchedule])
  );

  const handleOptions = () => {
    if (!data) return;

    const options: AlertButton[] = [
      {
        text: "Edit",
        onPress: () =>
          navigation.navigate("EditSchedule", { scheduleId: data.id }),
      },
      ...(!data.completed
        ? [
            {
              text: "Mark as Done",
              onPress: async () => {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                  Alert.alert(
                    "Error",
                    "You must be logged in to update a schedule."
                  );
                  return;
                }
                try {
                  setBusy(true);
                  const nid = (data as any)?.notificationId as
                    | string
                    | undefined;
                  await cancelReminder(nid); //cancel notification for completed schedule
                  await updateDoc(
                    doc(db, "users", currentUser.uid, "schedules", data.id),
                    { completed: true }
                  );
                  setData((prev) =>
                    prev ? { ...prev, completed: true } : prev
                  );
                } catch (e: any) {
                  Alert.alert("Error", e?.message || "Failed to mark as done.");
                } finally {
                  setBusy(false);
                }
              },
            },
          ]
        : []),
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Schedule",
            `Are you sure you want to delete "${data.title}"? This action cannot be undone.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  const currentUser = auth.currentUser;
                  if (!currentUser) {
                    Alert.alert(
                      "Error",
                      "You must be logged in to delete a schedule."
                    );
                    return;
                  }
                  try {
                    setBusy(true);
                    await cancelReminder((data as any)?.notificationId);
                    await deleteDoc(
                      doc(db, "users", currentUser.uid, "schedules", data.id)
                    );
                    Alert.alert("Success", "Schedule deleted successfully!");
                    if (fromHome) {
                      navigation.getParent()?.navigate("Home");
                    } else {
                      navigation.goBack();
                    }
                  } catch (e: any) {
                    Alert.alert(
                      "Error",
                      e?.message || "Failed to delete schedule."
                    );
                  } finally {
                    setBusy(false);
                  }
                },
              },
            ]
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ];

    Alert.alert(
      "Schedule Options",
      `What would you like to do with "${data.title}"?`,
      options,
      { cancelable: true }
    );
  };

  if (!data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  const scheduleDate =
    data.scheduledAt instanceof Timestamp ? data.scheduledAt.toDate() : null;
  const day = scheduleDate ? moment(scheduleDate).format("DD") : "--";
  const month = scheduleDate ? moment(scheduleDate).format("MMM") : "---";
  const fullDate = scheduleDate
    ? moment(scheduleDate).format("dddd, MMMM Do, YYYY")
    : "No date";
  const time = scheduleDate ? moment(scheduleDate).format("h:mma") : "No time";

  const bodyParts: string[] =
    (Array.isArray(exercise?.bodyParts) && exercise?.bodyParts) ||
    (exercise?.bodyPart ? [exercise.bodyPart] : []);

  const equipments: string[] =
    (Array.isArray(exercise?.equipments) && exercise?.equipments) ||
    (exercise?.equipment ? [exercise.equipment] : []);

  const steps: string[] = Array.isArray(exercise?.instructions)
    ? exercise.instructions
    : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (fromHome) {
              navigation.getParent()?.navigate("Home");
            } else {
              navigation.goBack();
            }
          }}
          style={styles.closeButton}
        >
          <MaterialCommunityIcons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Detail</Text>
        <TouchableOpacity
          onPress={handleOptions}
          style={styles.optionsButton}
          disabled={busy}
        >
          <MaterialCommunityIcons name="dots-vertical" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.container}>
        <View style={styles.timeCard}>
          <View style={styles.timeDateContainer}>
            <Text style={styles.timeDay}>{day}</Text>
            <Text style={styles.timeMonth}>{month.toUpperCase()}</Text>
          </View>
          <View style={styles.timeDetails}>
            <Text style={styles.timeFullDate}>{fullDate}</Text>
            <Text style={styles.timeValue}>{time}</Text>
          </View>
        </View>

        <Text style={styles.mainTitle}>{data.title}</Text>

        {data.completed !== undefined && (
          <View
            style={[
              styles.statusTag,
              data.completed
                ? styles.statusTagComplete
                : styles.statusTagPending,
            ]}
          >
            <MaterialCommunityIcons
              name={data.completed ? "check-circle" : "clock-alert"}
              size={16}
              color="#fff"
            />
            <Text style={styles.statusTagText}>
              {data.completed ? "Completed" : "Pending"}
            </Text>
          </View>
        )}
        <Text style={styles.label}>Workout</Text>
        <Text style={styles.value}>{data.selectedWorkoutName}</Text>

        {(data.customSets || data.customReps || data.customRestSeconds) && (
          <>
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>Your Plan</Text>
            <View style={styles.statsRow}>
              {data.customSets && (
                <StatBox
                  icon="weight-lifter"
                  value={String(data.customSets)}
                  label="Sets"
                />
              )}
              {data.customReps && (
                <StatBox
                  icon="repeat"
                  value={String(data.customReps)}
                  label="Reps"
                />
              )}
              {data.customRestSeconds && (
                <StatBox
                  icon="timer-sand"
                  value={`${data.customRestSeconds}s`}
                  label="Rest"
                />
              )}
            </View>
            {data.customLabel && (
              <>
                <Text style={styles.label}>Note</Text>
                <Text style={styles.noteValue}>{data.customLabel}</Text>
              </>
            )}
          </>
        )}

        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>Exercise Details</Text>

        {exercise ? (
          <>
            {!!exercise.gifUrl && (
              <Image
                source={{ uri: exercise.gifUrl }}
                style={styles.gif}
                resizeMode="cover"
              />
            )}

            {bodyParts.length > 0 && (
              <>
                <Text style={styles.subLabel}>Body Part(s)</Text>
                <View style={styles.tagsContainer}>
                  {bodyParts.map((part) => (
                    <Tag key={part} text={part} />
                  ))}
                </View>
              </>
            )}

            {equipments.length > 0 && (
              <>
                <Text style={styles.subLabel}>Equipment</Text>
                <View style={styles.tagsContainer}>
                  {equipments.map((eq) => (
                    <Tag key={eq} text={eq} />
                  ))}
                </View>
              </>
            )}

            {steps.length > 0 && (
              <>
                <Text style={styles.subLabel}>Instructions</Text>
                <View style={{ marginTop: 6, marginBottom: 20 }}>
                  {steps.map((s, i) => (
                    <Text key={i} style={styles.step}>
                      {s}
                    </Text>
                  ))}
                </View>
              </>
            )}
          </>
        ) : (
          <Text style={[styles.value, { color: "#7b7b7b" }]}>
            No exercise details found.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#262135" },
  container: {
    flex: 1,
    backgroundColor: "transparent",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 24,
    paddingBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 23,
    fontWeight: "bold",
  },
  optionsButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  timeCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3a324e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  timeDateContainer: {
    alignItems: "center",
    marginRight: 16,
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: "#555",
  },
  timeDay: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  timeMonth: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    marginTop: -4,
  },
  timeDetails: {
    flex: 1,
  },
  timeFullDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  timeValue: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 4,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  statusTagComplete: {
    backgroundColor: "#34A853",
  },
  statusTagPending: {
    backgroundColor: "#FBBC05",
  },
  statusTagText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },
  label: {
    color: "#aaa",
    marginTop: 12,
    fontSize: 14,
  },
  subLabel: {
    color: "#ddd",
    marginTop: 16,
    fontWeight: "600",
    fontSize: 16,
  },
  value: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  noteValue: {
    color: "#eee",
    fontSize: 15,
    fontStyle: "italic",
    marginTop: 4,
    backgroundColor: "#3a324e",
    padding: 10,
    borderRadius: 8,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#444",
    marginVertical: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  gif: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#444",
    marginTop: 12,
  },
  step: {
    color: "#ddd",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#3a324e",
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#ccc",
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  tag: {
    backgroundColor: "#4a90e2",
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  tagText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
});
