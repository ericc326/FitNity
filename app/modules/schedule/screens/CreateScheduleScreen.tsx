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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScheduleStackParamList } from "../navigation/ScheduleNavigator";
import { db, auth } from "../../../../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import moment from "moment";

type Props = NativeStackScreenProps<ScheduleStackParamList, "CreateSchedule">;

const CreateScheduleScreen = ({ navigation, route }: Props) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState("Front Square");
  const fromHome = !!route?.params?.fromHome;

  // accept selected exercises returned from SelectExercise
  useEffect(() => {
    const sel = (route.params as any)?.selectedExercises as
      | string[]
      | undefined;
    if (sel && sel.length) {
      setSelectedWorkout(sel.join(", "));
    }
  }, [route.params]);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const onChangeTime = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (selectedTime) setDate(selectedTime);
  };

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to create a schedule.");
      return;
    }

    if (!title.trim() || !description.trim()) {
      Alert.alert("Validation Error", "Title and Description cannot be empty.");
      return;
    }

    setLoading(true);

    try {
      // Reference to the user's specific 'schedules' subcollection
      const userSchedulesRef = collection(
        db,
        "users",
        currentUser.uid,
        "schedules"
      );

      const newScheduleData = {
        title: title.trim(),
        description: description.trim(),
        scheduledAt: date,
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonymous",
        completed: false,
        // exerciseIds: selectedExerciseIds || [], // later need add for track
        selectedWorkoutName: selectedWorkout,
      };

      await addDoc(userSchedulesRef, newScheduleData);

      Alert.alert("Success", "Schedule saved successfully!");
      // If opened from Home, go back to Home tab; otherwise pop back to ScheduleList
      if (fromHome) {
        navigation.getParent()?.navigate("Home");
      } else {
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert("Error", `Failed to save schedule: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Header */}
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
          <Text style={styles.headerTitle}>Add Schedule</Text>
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
            editable={!loading} // Disable while saving
          />

          {/* Description Input */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter description"
            placeholderTextColor="#aaa"
            value={description}
            onChangeText={setDescription}
            multiline={true}
            numberOfLines={4}
            editable={!loading} // Disable while saving
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

          {/* Details Workout Section */}
          <Text style={styles.detailsWorkoutHeader}>Details Workout</Text>

          {/* Choose Workout Button (when clicked linked to select exercise screen*/}
          <TouchableOpacity
            style={styles.workoutDetailButton}
            disabled={loading}
            onPress={() => {
              // navigate to SelectExercise inside Workout stack
              navigation.getParent()?.navigate("Workout", {
                screen: "SelectExercise",
                params: { returnToCreateSchedule: true, fromHome },
              });
            }}
          >
            <MaterialCommunityIcons name="dumbbell" size={20} color="#bdbdbd" />
            <Text style={styles.workoutDetailButtonText}>Choose Workout</Text>
            <View style={styles.workoutDetailRight}>
              <Text style={styles.workoutDetailRightText}>
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
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color="#bdbdbd"
              />
            </View>
          </TouchableOpacity>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? "Saving..." : "Save"}{" "}
              {/* <--- Update button text based on loading state */}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
    flex: 1,
    color: "#fff",
    fontSize: 15,
    marginLeft: 12,
    fontWeight: "500",
  },
  workoutDetailRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  workoutDetailRightText: {
    color: "#bdbdbd",
    fontSize: 13,
    marginRight: 4,
    fontWeight: "500",
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

export default CreateScheduleScreen;
