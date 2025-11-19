import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  AlertButton,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import moment from "moment";
import { ScheduleStackParamList } from "../navigation/ScheduleNavigator";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { db, auth } from "../../../../firebaseConfig";
import {
  collection,
  query,
  orderBy,
  getDocs,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
  where,
} from "firebase/firestore";
import LoadingIndicator from "../../../../app/components/LoadingIndicator";
import { cancelReminder } from "../../../services/NotificationService";

type ScheduleScreenNavigationProp = NativeStackNavigationProp<
  ScheduleStackParamList,
  "ScheduleList"
>;

// Define the ScheduleItem interface to match Firestore data structure
interface ScheduleItem {
  id: string; // Document ID from Firestore
  title: string;
  selectedWorkoutName: string;
  scheduledAt: Timestamp; // Firestore Timestamp type
  userId: string;
  userName: string;
  createdAt: Timestamp; // Firestore Timestamp type
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  completed?: boolean;
  color?: string;
  notificationId?: string | null; // stored when created
}

const ScheduleScreen = () => {
  const navigation = useNavigation<ScheduleScreenNavigationProp>();
  const [selectedDate, setSelectedDate] = useState(moment());
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // To generate dates for the horizontal calendar
  const generateDates = (currentDate: moment.Moment) => {
    const dates = [];
    const startOfWeek = moment(currentDate).startOf("week");
    for (let i = 0; i < 14; i++) {
      dates.push(moment(startOfWeek).add(i, "days"));
    }
    return dates;
  };

  const dates = generateDates(selectedDate);

  // fetch schedules from Firestore
  const fetchSchedules = async (refresh = false) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setSchedules([]);
      setLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const schedulesRef = collection(
        db,
        "users",
        currentUser.uid,
        "schedules"
      );

      // Create start and end of the selected date
      const startOfDay = moment(selectedDate).startOf("day").toDate();
      const endOfDay = moment(selectedDate).endOf("day").toDate();

      // Add date range filter to the query
      const q = query(
        schedulesRef,
        where("scheduledAt", ">=", startOfDay),
        where("scheduledAt", "<=", endOfDay),
        orderBy("scheduledAt", "asc")
      );

      const querySnapshot = await getDocs(q);
      const fetchedSchedules: ScheduleItem[] = [];
      querySnapshot.forEach((doc) => {
        fetchedSchedules.push({ id: doc.id, ...doc.data() } as ScheduleItem);
      });
      setSchedules(fetchedSchedules);
    } catch (error: any) {
      console.error("Error fetching schedules:", error);
      Alert.alert("Error", "Failed to fetch schedules: " + error.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedules(false);
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      fetchSchedules(false);
    }, [])
  );

  const onRefresh = () => {
    fetchSchedules(true);
  };

  const handleOptions = (schedule: ScheduleItem) => {
    const options: AlertButton[] = [
      {
        text: "Edit",
        onPress: () => {
          navigation.navigate("EditSchedule", {
            scheduleId: schedule.id,
          });
        },
      },
      {
        text: "Mark as Done",
        onPress: async () => {
          const currentUser = auth.currentUser;
          if (!currentUser) {
            Alert.alert("Error", "You must be logged in to update a schedule.");
            return;
          }
          try {
            const scheduleRef = doc(
              db,
              "users",
              currentUser.uid,
              "schedules",
              schedule.id
            );
            await cancelReminder(schedule.notificationId); // cancel completed schedule notification
            await updateDoc(scheduleRef, { completed: true });
            fetchSchedules();
          } catch (error: any) {
            Alert.alert("Error", "Failed to mark as done: " + error.message);
          }
        },
        style: schedule.completed ? "default" : "default",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Schedule",
            `Are you sure you want to delete "${schedule.title}"? This action cannot be undone.`,
            [
              {
                text: "Cancel",
                style: "cancel",
              },
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
                    const scheduleRef = doc(
                      db,
                      "users",
                      currentUser.uid,
                      "schedules",
                      schedule.id
                    );
                    // cancel local notification if any
                    await cancelReminder(schedule.notificationId);
                    await deleteDoc(scheduleRef);
                    Alert.alert("Success", "Schedule deleted successfully!");
                    fetchSchedules();
                  } catch (error: any) {
                    console.error("Error deleting schedule:", error);
                    Alert.alert(
                      "Error",
                      "Failed to delete schedule: " + error.message
                    );
                  }
                },
              },
            ]
          );
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ];

    const isCompleted = !!schedule.completed;

    // Filter out "Mark as Done" if already completed
    const filteredOptions = isCompleted
      ? options.filter((opt) => opt.text !== "Mark as Done")
      : options;

    Alert.alert(
      "Schedule Options",
      `What would you like to do with "${schedule.title}"?`,
      filteredOptions,
      { cancelable: true }
    );
  };

  const renderDayItem = ({ item }: { item: moment.Moment }) => {
    const isSelected = item.isSame(selectedDate, "day");
    const isToday = item.isSame(moment(), "day");

    return (
      <TouchableOpacity
        style={[
          styles.dayContainer,
          isSelected && styles.selectedDayContainer,
          isToday && !isSelected && styles.todayContainer,
        ]}
        onPress={() => setSelectedDate(item)}
      >
        <Text style={styles.dayText}>{item.format("dd")}</Text>
        <Text style={[styles.dateText, isSelected && styles.selectedDateText]}>
          {item.format("D")}
        </Text>
      </TouchableOpacity>
    );
  };

  // To use ScheduleItem interface
  const renderScheduleItem = ({ item }: { item: ScheduleItem }) => {
    const scheduledMoment =
      item.scheduledAt instanceof Timestamp
        ? moment(item.scheduledAt.toDate())
        : moment(item.scheduledAt);

    const itemColor = item.color || "#f0f8ff";
    const itemIcon = item.icon || "dumbbell";

    return (
      <View style={styles.scheduleItemWrapper}>
        <View style={styles.timelineIndicator}>
          <View
            style={[styles.circle, item.completed && styles.completedCircle]}
          />
          <View style={styles.line} />
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.scheduleCard, { backgroundColor: itemColor }]}
          onPress={() =>
            navigation.navigate("ScheduleDetail", { scheduleId: item.id })
          }
        >
          <View style={styles.scheduleCardContent}>
            <Text style={styles.scheduleTime}>
              {scheduledMoment.format("MMMM DD, YYYY, h:mma")}{" "}
              {/* Display formatted time */}
            </Text>
            <Text
              style={styles.scheduleTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>
            <Text
              style={styles.scheduleDescription}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.selectedWorkoutName}
            </Text>
          </View>
          <View style={styles.scheduleCardActions}>
            <MaterialCommunityIcons
              name={itemIcon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={24}
              color="#000"
            />
            <TouchableOpacity
              onPress={() => handleOptions(item)}
              style={styles.optionsButton}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={24}
                color="#000"
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const handleAddSchedule = () => {
    navigation.navigate("CreateSchedule", { fromHome: false });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Header with Date */}
        <View style={styles.header}>
          <Text style={styles.todayIsText}>
            {selectedDate.isSame(moment(), "day")
              ? "TODAY IS"
              : "SELECTED DATE"}
          </Text>
          <Text style={styles.currentDateText}>
            {selectedDate.format("DD, MMMM YYYY")}
          </Text>
          <View style={styles.navigationArrows}>
            <TouchableOpacity
              onPress={() =>
                setSelectedDate(moment(selectedDate).subtract(1, "week"))
              }
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={30}
                color="#fff"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                setSelectedDate(moment(selectedDate).add(1, "week"))
              }
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={30}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Horizontal Calendar */}
        <FlatList
          data={dates}
          renderItem={renderDayItem}
          keyExtractor={(item) => item.format("YYYY-MM-DD")}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarList}
          style={styles.calendarFlatList}
        />

        {/* Schedule Section */}
        <View style={styles.scheduleSection}>
          <View style={styles.yourScheduleHeader}>
            <Text style={styles.yourScheduleTitle}>Your Schedule</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddSchedule}
            >
              <MaterialCommunityIcons name="plus" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {loading && !isRefreshing ? (
            <LoadingIndicator color="#4a90e2" />
          ) : schedules.length > 0 ? (
            <ScrollView
              contentContainerStyle={styles.scheduleContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  tintColor="#4a90e2"
                />
              }
            >
              <FlatList
                data={schedules}
                renderItem={renderScheduleItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </ScrollView>
          ) : (
            <Text style={styles.noSchedulesText}>
              No schedules found. Click '+' to add one!
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#262135",
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 40,
  },
  todayIsText: {
    color: "#8a84a5",
    fontSize: 14,
    fontWeight: "500",
  },
  currentDateText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 4,
  },
  navigationArrows: {
    flexDirection: "row",
    position: "absolute",
    top: 40,
    right: 16,
  },
  calendarList: {
    paddingHorizontal: 16,
  },
  calendarFlatList: {
    paddingVertical: 8,
    marginBottom: 0,
  },
  dayContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 45,
    height: 60,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  selectedDayContainer: {
    backgroundColor: "#ffc0cb",
  },
  todayContainer: {
    borderWidth: 1,
    borderColor: "#ffc0cb",
  },
  dayText: {
    color: "#fff",
    fontSize: 12,
    marginBottom: 4,
  },
  dateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  selectedDateText: {
    color: "#262135",
  },
  scheduleSection: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    marginTop: -400,
  },
  scheduleContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  yourScheduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  yourScheduleTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },
  addButton: {
    backgroundColor: "#d8bcfd",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scheduleItemWrapper: {
    flexDirection: "row",
    marginBottom: 15,
  },
  timelineIndicator: {
    width: 20,
    alignItems: "center",
    marginRight: 10,
  },
  circle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ccc",
    borderWidth: 2,
    borderColor: "#eee",
    zIndex: 1,
  },
  completedCircle: {
    backgroundColor: "#7b68ee",
    borderColor: "#7b68ee",
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: "#eee",
    marginTop: -2,
  },
  scheduleCard: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  scheduleCardContent: {
    flex: 1,
    marginRight: 10,
  },
  scheduleCardActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionsButton: {
    paddingLeft: 8,
  },
  scheduleTime: {
    color: "#000",
    fontSize: 12,
  },
  scheduleTitle: {
    flexShrink: 1,
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 5,
  },
  scheduleDescription: {
    flexShrink: 1,
    color: "#555",
    fontSize: 14,
    marginTop: 3,
  },
  noSchedulesText: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 20,
  },
});

export default ScheduleScreen;
