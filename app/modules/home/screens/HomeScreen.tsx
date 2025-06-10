import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AIChatBox from "../../../components/AIChatBox";
import {
  useNavigation,
  CompositeNavigationProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  HomeTabParamList,
  RootStackParamList,
} from "../../../navigation/AppNavigator";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<HomeTabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

const workouts = [
  {
    title: "ABS BEGINNER",
    duration: "78 min",
    exercises: 28,
    image: require("../../../assets/beginnerWorkout.jpeg"),
  },
  {
    title: "Biceps BEGINNER",
    duration: "78 min",
    exercises: 28,
    image: require("../../../assets/beginnerWorkout.jpeg"),
  },
  {
    title: "Triceps BEGINNER",
    duration: "78 min",
    exercises: 28,
    image: require("../../../assets/beginnerWorkout.jpeg"),
  },
];

const todayTasks = [
  {
    id: "1",
    time: "07:00 AM",
    title: "Morning Workout",
    type: "workout",
    duration: "45 min",
    completed: true,
  },
  {
    id: "2",
    time: "09:00 AM",
    title: "Protein Breakfast",
    type: "meal",
    duration: "20 min",
    completed: true,
  },
];

const HomeScreen: React.FC = () => {
  const [showChat, setShowChat] = useState(false);
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // Tab navigation
  const goToSchedule = () => navigation.navigate("Schedule");

  // Stack navigation
  const goToProfile = () => navigation.navigate("Profile");
  const goToStatistic = () => navigation.navigate("Statistic");

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "workout":
        return "dumbbell";
      case "meal":
        return "food-apple";
      default:
        return "calendar-check";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={{
          paddingLeft: 12,
          paddingRight: 12,
          paddingBottom: 20,
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hiText}>Hi!,</Text>
            <Text style={styles.nameText}>Youssef</Text>
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>Beginner</Text>
              <Text style={[styles.badge, styles.trainingBadge]}>Training</Text>
              <Text style={[styles.badge, styles.communityBadge]}>
                Community
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={goToProfile}>
            <Image
              source={require("../../../assets/profile.png")}
              style={styles.profilePic}
            />
          </TouchableOpacity>
        </View>
        {/* Statistic Section */}
        <View>
          <View style={styles.statisticsHeader}>
            <Text style={styles.statisticsSectionTitle}>Statistics</Text>
            <TouchableOpacity style={styles.viewButton} onPress={goToStatistic}>
              <Text style={styles.viewButtonText}>View All</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.statisticsContent}>
            <View style={styles.bmiBox}>
              <Text style={styles.statLabel}>BMI (Body Mass Index)</Text>
              <Text style={styles.statValue}>20.1</Text>
              <Text style={styles.statDesc}>You have a normal weight</Text>
            </View>
            <View style={styles.calorieBox}>
              <Text style={styles.statLabel}>Calorie</Text>
              <Text style={styles.statValue}>349 kcal</Text>
            </View>
          </View>
        </View>
        {/* Schedule Section */}
        <View style={styles.scheduleSection}>
          <View style={styles.scheduleSectionHeader}>
            <Text style={styles.scheduleSectionTitle}>Today's Schedule</Text>
            <TouchableOpacity style={styles.viewButton} onPress={goToSchedule}>
              <Text style={styles.viewButtonText}>View All</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tasksScrollContainer}
          >
            {todayTasks.map((task) => (
              <TouchableOpacity key={task.id} style={styles.taskCard}>
                <View style={styles.taskTimeColumn}>
                  <Text style={styles.taskTime}>{task.time}</Text>
                </View>
                <View style={styles.taskContent}>
                  <View style={styles.taskHeader}>
                    <View style={styles.taskTitleContainer}>
                      <MaterialCommunityIcons
                        name={getTaskIcon(task.type)}
                        size={20}
                        color="#4a90e2"
                      />
                      <Text style={styles.taskTitle}>{task.title}</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={task.completed ? "check-circle" : "circle-outline"}
                      size={24}
                      color={task.completed ? "#4CAF50" : "#8a84a5"}
                    />
                  </View>
                  <Text style={styles.taskDuration}>{task.duration}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Create Workout Button */}
        <TouchableOpacity style={styles.createWorkoutBtn}>
          <Text style={styles.createWorkoutText}>Create Workout</Text>
        </TouchableOpacity>

        {/* Suggestion Workouts */}
        <Text style={styles.sectionTitle}>Suggestion Workouts</Text>
        {workouts.map((workout, i) => (
          <View key={i} style={styles.workoutCard}>
            <Image source={workout.image} style={styles.workoutImage} />
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>{workout.title}</Text>
              <Text style={styles.workoutMeta}>
                ⏱ {workout.duration} • 🔥 {workout.exercises} Exercises
              </Text>
              <TouchableOpacity style={styles.startBtn}>
                <Text style={styles.startBtnText}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
      {/* Floating Chat Icon */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => setShowChat(true)}
      >
        <MaterialCommunityIcons
          name="robot"
          size={30}
          color="#4a90e2"
          style={styles.chatIcon}
        />
      </TouchableOpacity>
      <AIChatBox visible={showChat} onClose={() => setShowChat(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#262135" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hiText: { color: "#fff", fontSize: 36, fontWeight: "bold", paddingLeft: 10 },
  nameText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    paddingLeft: 10,
  },
  badgeRow: { flexDirection: "row", marginTop: 8, gap: 6, marginBottom: 20 },
  badge: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 12,
  },
  trainingBadge: { backgroundColor: "#f55" },
  communityBadge: { backgroundColor: "#4a90e2", color: "#fff" },
  profilePic: { width: 100, height: 100, borderRadius: 25 },
  statisticsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  statisticsSectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  statisticsContent: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#89B9FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  bmiBox: {
    backgroundColor: "#5a6df0",
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginRight: 10,
  },
  calorieBox: {
    backgroundColor: "#3b3f55",
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginLeft: 10,
  },
  statLabel: { color: "#fff", fontSize: 12 },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  statDesc: { color: "#fff", fontSize: 12, marginTop: 4 },
  calendar: { marginTop: 30 },
  monthText: { color: "#fff", fontSize: 16, marginBottom: 10 },
  createWorkoutBtn: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  createWorkoutText: { fontWeight: "bold" },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 30,
    marginBottom: 10,
  },
  workoutCard: {
    flexDirection: "row",
    backgroundColor: "#333",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  workoutImage: {
    width: 100,
    height: 100,
  },
  workoutInfo: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  workoutTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  workoutMeta: { color: "#ccc", fontSize: 12 },
  startBtn: {
    backgroundColor: "#f57c00",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  startBtnText: { color: "#fff", fontWeight: "bold" },
  chatButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 12,
    elevation: 5,
  },
  chatIcon: { width: 30, height: 30 },
  chatModal: {
    backgroundColor: "#1e1e2e",
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  chatTitle: { fontSize: 20, color: "#fff", marginBottom: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30,30,46,0.7)", // semi-transparent background
    justifyContent: "center",
    alignItems: "center",
  },
  chatModalBox: {
    backgroundColor: "#1e1e2e",
    borderRadius: 16,
    padding: 24,
    minWidth: 280,
    alignItems: "center",
  },
  scheduleSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  scheduleSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 4,
  },
  scheduleSectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  tasksScrollContainer: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  taskCard: {
    flexDirection: "row",
    backgroundColor: "#3C3952",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 280, // Fixed width for each card
  },
  taskTimeColumn: {
    marginRight: 12,
  },
  taskTime: {
    color: "#8a84a5",
    fontSize: 14,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  taskTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  taskDuration: {
    color: "#8a84a5",
    fontSize: 14,
    marginTop: 4,
  },
});

export default HomeScreen;
