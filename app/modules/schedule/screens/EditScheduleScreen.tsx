import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  AlertButton,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScheduleStackParamList } from "../navigation/ScheduleNavigator";
import { db, auth } from "../../../../firebaseConfig";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import moment from "moment";
import LoadingIndicator from "../../../components/LoadingIndicator";
import {
  ensureNotificationPermissions,
  scheduleWorkoutReminder,
  cancelReminder,
} from "../../../services/NotificationService";
import {
  checkTimeAvailability,
  suggestOptimalTime,
} from "../../../services/ScheduleSuggestionService";

type Props = NativeStackScreenProps<ScheduleStackParamList, "EditSchedule">;

const EditScheduleScreen = ({ navigation, route }: Props) => {
  const { scheduleId } = route.params as { scheduleId: string };
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState(60); // Default 60 minutes
  const [selectedWorkout, setSelectedWorkout] = useState("Front Square");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
    null
  );

  // custom repetitions/session state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customSets, setCustomSets] = useState<number | null>(null); //determine sets
  const [customReps, setCustomReps] = useState<number | null>(null); //determine rep in one set
  const [customRestSec, setCustomRestSec] = useState<number | null>(null);
  const [customLabel, setCustomLabel] = useState<string | null>(null);
  const [customWeight, setCustomWeight] = useState<string | null>(null); // body weight (kg)

  //schedule time for notification
  const [prevScheduledAt, setPrevScheduledAt] = useState<Date | null>(null);
  const [prevNotificationId, setPrevNotificationId] = useState<string | null>(
    null
  );

  //For suggesting optimal time loading indicator
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    const fetchSchedule = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in.");
        navigation.goBack();
        return;
      }
      try {
        const scheduleRef = doc(
          db,
          "users",
          currentUser.uid,
          "schedules",
          scheduleId
        );
        const snap = await getDoc(scheduleRef);
        if (snap.exists()) {
          const data = snap.data();
          setTitle(data.title || "");
          setDate(
            data.scheduledAt?.toDate ? data.scheduledAt.toDate() : new Date()
          );
          setPrevScheduledAt(
            data.scheduledAt?.toDate ? data.scheduledAt.toDate() : null
          );
          setDuration(data.duration ?? 60);
          setPrevNotificationId(
            typeof data.notificationId === "string" ? data.notificationId : null
          );
          setSelectedWorkout(data.selectedWorkoutName || "Front Square");
          setSelectedWorkoutId(
            typeof data.selectedWorkoutId === "string"
              ? data.selectedWorkoutId
              : null
          );
          setCustomSets(data.customSets ?? null);
          setCustomReps(data.customReps ?? null);
          setCustomRestSec(data.customRestSeconds ?? null);
          setCustomLabel(data.customLabel ?? null);
          setCustomWeight(data.weightLifted ?? null);
        } else {
          Alert.alert("Error", "Schedule not found.");
          navigation.goBack();
        }
      } catch (error: any) {
        Alert.alert("Error", `Failed to fetch schedule: ${error.message}`);
        navigation.goBack();
      } finally {
        setFetching(false);
      }
    };
    fetchSchedule();
  }, [scheduleId]);

  // accept selected exercises returned from SelectExercise
  useEffect(() => {
    const sel = (route.params as any)?.selectedExercise as string | undefined;
    if (sel) setSelectedWorkout(sel);
    const selId = (route.params as any)?.selectedExerciseId as
      | string
      | undefined;
    if (selId) setSelectedWorkoutId(selId);
  }, [route.params]);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const onChangeTime = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (selectedTime) setDate(selectedTime);
  };

  const handleSmartSuggestion = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setIsSuggesting(true); // Shows the LoadingIndicator
    try {
      const suggestion = await suggestOptimalTime(
        currentUser.uid,
        date,
        duration,
        scheduleId
      );

      if (suggestion) {
        Alert.alert(
          "✨ Smart Suggestion",
          `Based on your '${suggestion.fitnessLevel}' level, we found a optimal time slot:\n\n` +
            `⏰ ${moment(suggestion.time).format("h:mm A")}\n` +
            `📝 Reason: ${suggestion.reason}`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Use This Time",
              onPress: () => setDate(suggestion.time),
            },
          ]
        );
      } else {
        Alert.alert(
          "No Perfect Match",
          "We couldn't find an optimal time slot in your preferred windows for this specific date."
        );
      }
    } catch (error) {
      console.error("Suggestion Error:", error);
      Alert.alert("Error", "Could not analyze schedule availability.");
    } finally {
      setIsSuggesting(false); // Hides the LoadingIndicator
    }
  };

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to edit a schedule.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Validation Error", "Title cannot be empty.");
      return;
    }

    setLoading(true);

    try {
      // Check if the selected time slot is available
      const availability = await checkTimeAvailability(
        currentUser.uid,
        date,
        duration,
        scheduleId
      );

      if (!availability.available) {
        const alertButtons: AlertButton[] = [
          { text: "Cancel", style: "cancel" },
        ];

        // Only add "Switch" button if a valid next time exists
        // This prevents "Switch to Invalid date" button for past time errors
        if (availability.nextAvailable) {
          alertButtons.push({
            text: `Switch to ${moment(availability.nextAvailable).format("h:mm A")}`,
            onPress: () => setDate(availability.nextAvailable!),
          });
        }

        // Check if the conflict is specifically "Past Time" to show a cleaner message
        const conflictTitle =
          availability.conflicts?.[0]?.title || "a conflict";
        const errorMessage =
          conflictTitle === "Past Time"
            ? "Cannot schedule in the past."
            : `You already have "${conflictTitle}" at this time.`;

        Alert.alert("Time Conflict", errorMessage, alertButtons);
        setLoading(false);
        return; // STOP saving
      }

      const scheduleRef = doc(
        db,
        "users",
        currentUser.uid,
        "schedules",
        scheduleId
      );

      // handle notification changes if time changed
      let newNotificationId: string | null = prevNotificationId;
      const didChangeTime =
        (prevScheduledAt?.getTime() || 0) !== date.getTime();
      if (didChangeTime) {
        try {
          await cancelReminder(prevNotificationId);
          const ok = await ensureNotificationPermissions();
          if (ok) {
            newNotificationId = await scheduleWorkoutReminder(
              date,
              title.trim()
            );
          }
        } catch {}
      }

      await updateDoc(scheduleRef, {
        title: title.trim(),
        scheduledAt: Timestamp.fromDate(date),
        duration: duration,
        selectedWorkoutName: selectedWorkout,
        selectedWorkoutId: selectedWorkoutId ?? null,
        customSets: customSets ?? undefined,
        customReps: customReps ?? undefined,
        customRestSeconds: customRestSec ?? undefined,
        weightLifted: customWeight ?? undefined,
        customLabel: customLabel ?? undefined,
        notificationId: newNotificationId ?? null,
      });

      setPrevScheduledAt(date);
      setPrevNotificationId(newNotificationId ?? null);
      Alert.alert("Success", "Schedule updated successfully!");
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", `Failed to update schedule: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <MaterialCommunityIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Schedule</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Input */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter schedule title"
            placeholderTextColor="#aaa"
            value={title}
            onChangeText={setTitle}
            editable={!loading}
          />

          {/* DatePicker Component */}
          <Text style={styles.label}>Date</Text>
          {Platform.OS === "ios" ? (
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={onChangeDate}
              style={{ backgroundColor: "#262135" }}
              textColor="#fff"
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
                disabled={loading}
              >
                <Text style={{ color: "#fff" }}>
                  {moment(date).format("YYYY-MM-DD")}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onChangeDate}
                />
              )}
            </>
          )}

          {/* TimePicker */}
          <Text style={styles.label}>Time</Text>
          {Platform.OS === "ios" ? (
            <DateTimePicker
              value={date}
              mode="time"
              display="spinner"
              onChange={onChangeTime}
              style={{ backgroundColor: "#262135" }}
              textColor="#fff"
              is24Hour={false}
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowTimePicker(true)}
                disabled={loading}
              >
                <Text style={{ color: "#fff" }}>
                  {moment(date).format("hh:mm A")}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={date}
                  mode="time"
                  display="default"
                  onChange={onChangeTime}
                  is24Hour={false}
                />
              )}
            </>
          )}

          {/* DURATION SELECTOR */}
          <Text style={styles.label}>Duration (minutes)</Text>
          <View style={styles.durationContainer}>
            {[30, 45, 60, 75, 90].map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.durationButton,
                  duration === mins && styles.durationButtonActive,
                ]}
                onPress={() => setDuration(mins)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.durationText,
                    duration === mins && styles.durationTextActive,
                  ]}
                >
                  {mins}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Smart Suggestion Button */}
          <TouchableOpacity
            style={styles.suggestionButton}
            onPress={handleSmartSuggestion}
            disabled={isSuggesting || loading}
          >
            <MaterialCommunityIcons
              name="magic-staff"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.suggestionButtonText}>
              {isSuggesting ? "Finding Best Time..." : "Suggest Optimal Time"}
            </Text>
          </TouchableOpacity>

          {/* Details Workout Section */}
          <Text style={styles.detailsWorkoutHeader}>Details Workout</Text>

          {/* Choose Workout Button */}
          <TouchableOpacity
            style={styles.workoutDetailButton}
            disabled={loading}
            onPress={() => {
              // navigate to SelectExercise inside Workout stack
              navigation.getParent()?.navigate("Workout", {
                screen: "SelectExercise",
                params: { returnToEditSchedule: true, scheduleId },
              });
            }}
          >
            <MaterialCommunityIcons name="dumbbell" size={20} color="#bdbdbd" />
            <Text
              style={styles.workoutDetailButtonText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Choose Workout
            </Text>
            <View style={styles.workoutDetailRight}>
              <Text
                style={styles.workoutDetailRightText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedWorkout}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color="#bdbdbd"
              />
            </View>
          </TouchableOpacity>

          {/* Custom Repetitions and Session Button */}
          <TouchableOpacity
            style={styles.workoutDetailButton}
            disabled={loading}
            onPress={() => setShowCustomModal(true)}
          >
            <MaterialCommunityIcons
              name="chart-bar"
              size={20}
              color="#bdbdbd"
            />
            <Text style={styles.workoutDetailButtonText}>
              Custom Repetitions and Session
            </Text>
            <View style={styles.workoutDetailRight}>
              <Text style={styles.workoutDetailRightText}>
                {customLabel ?? "Set reps & rest"}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color="#bdbdbd"
              />
            </View>
          </TouchableOpacity>

          {/* Custom modal */}
          <Modal visible={showCustomModal} transparent animationType="fade">
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Custom Reps & Rest</Text>

                <View style={styles.modalRow}>
                  <Text style={{ color: "#fff", marginBottom: 6 }}>Sets</Text>
                  <TextInput
                    style={styles.numberInput}
                    value={customSets?.toString() ?? ""}
                    onChangeText={(t) => setCustomSets(t ? Number(t) : null)}
                    keyboardType="numeric"
                    placeholder="e.g. 3"
                    placeholderTextColor="#777"
                  />
                </View>

                <View style={styles.modalRow}>
                  <Text style={{ color: "#fff", marginBottom: 6 }}>
                    Reps / Set
                  </Text>
                  <TextInput
                    style={styles.numberInput}
                    value={customReps?.toString() ?? ""}
                    onChangeText={(t) => setCustomReps(t ? Number(t) : null)}
                    keyboardType="numeric"
                    placeholder="e.g. 10"
                    placeholderTextColor="#777"
                  />
                </View>

                <View style={styles.modalRow}>
                  <Text style={{ color: "#fff", marginBottom: 6 }}>
                    Rest (sec)
                  </Text>
                  <TextInput
                    style={styles.numberInput}
                    value={customRestSec?.toString() ?? ""}
                    onChangeText={(t) => setCustomRestSec(t ? Number(t) : null)}
                    keyboardType="numeric"
                    placeholder="e.g. 60"
                    placeholderTextColor="#777"
                  />
                </View>

                <View style={styles.modalRow}>
                  <Text style={{ color: "#fff", marginBottom: 6 }}>
                    Weight (kg / lbs)
                  </Text>
                  <TextInput
                    style={styles.numberInput}
                    value={customWeight ?? ""}
                    onChangeText={(t) => setCustomWeight(t || null)}
                    placeholder="e.g. 20kg or Bodyweight"
                    placeholderTextColor="#777"
                  />
                </View>

                <View style={styles.modalButtons}>
                  <Pressable
                    style={[styles.modalButton, { backgroundColor: "#444" }]}
                    onPress={() => setShowCustomModal(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalButton, { backgroundColor: "#7b68ee" }]}
                    onPress={() => {
                      // apply and close
                      const sets = customSets ?? 0;
                      const reps = customReps ?? 0;
                      const rest = customRestSec ?? 0;
                      const label = `${sets}×${reps} • rest ${rest}s`;
                      setCustomLabel(label);
                      setShowCustomModal(false);
                    }}
                  >
                    <Text style={styles.modalButtonText}>Apply</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        {/* Overlay Loading Indicator when suggesting */}
        {isSuggesting && <LoadingIndicator />}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#262135",
  },
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  formContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 15,
    color: "#fff",
    marginBottom: 8,
    marginTop: 16,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#fff",
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
    paddingVertical: 10,
  },
  dateText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 10,
    fontWeight: "500",
  },
  timeLabel: {
    fontSize: 15,
    color: "#fff",
    marginBottom: 8,
    fontWeight: "500",
  },
  timeInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#fff",
    marginBottom: 24,
    borderWidth: 0,
  },
  timeInputText: {
    color: "#fff",
    fontSize: 16,
  },
  durationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  durationButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  durationButtonActive: {
    backgroundColor: "rgba(74, 144, 226, 0.2)",
    borderColor: "#4a90e2",
  },
  durationText: {
    color: "#bdbdbd",
    fontWeight: "600",
    fontSize: 14,
  },
  durationTextActive: {
    color: "#4a90e2",
    fontWeight: "bold",
  },
  suggestionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4a90e2",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 10,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  suggestionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  detailsWorkoutHeader: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 8,
  },
  workoutDetailButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutDetailButtonText: {
    color: "#fff",
    fontSize: 15,
    marginLeft: 12,
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },
  workoutDetailRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    maxWidth: 180,
  },
  workoutDetailRightText: {
    color: "#bdbdbd",
    fontSize: 13,
    marginRight: 4,
    fontWeight: "500",
    maxWidth: 140,
    flexShrink: 1,
    textAlign: "right",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#2b2435",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  modalRow: {
    marginBottom: 12,
  },
  numberInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    padding: 10,
    color: "#fff",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  saveButton: {
    marginTop: 32,
    borderRadius: 20,
    backgroundColor: "#7b68ee",
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  gradientButtonBackground: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});

export default EditScheduleScreen;
