import React, { useState, useEffect } from "react";
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
import { auth, db } from "../../../../firebaseConfig";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs,
} from "firebase/firestore";
import moment from "moment";

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

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiDesc, setBmiDesc] = useState<string>("");

  useEffect(() => {
    const fetchHealthInfo = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        // Get the healthinfo collection (assume only one doc)
        const healthInfoRef = collection(
          db,
          "users",
          currentUser.uid,
          "healthinfo"
        );
        const snapshot = await getDocs(healthInfoRef);

        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setBmi(data.bmi ?? null);

          // Set BMI description
          let desc = "";
          if (data.bmi === undefined || data.bmi === null) desc = "--";
          else if (data.bmi < 18.5) desc = "Underweight";
          else if (data.bmi < 25) desc = "You have a normal weight";
          else if (data.bmi < 30) desc = "Overweight";
          else desc = "Obese";
          setBmiDesc(desc);
        }
      } catch (error) {
        console.error("Error fetching health info:", error);
      }
    };

    fetchHealthInfo();
  }, []);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      navigation.navigate("Auth", { screen: "Login" });
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(
      userRef,
      async (snap) => {
        try {
          if (snap.exists()) {
            const d = snap.data() as any;
            setUserName(d?.name ?? auth.currentUser?.displayName ?? "");

            const photo = d?.photoURL;
            // Use photoURL directly as profile image (cuz ady store in https://)
            if (photo && typeof photo === "string") {
              setProfileImage(photo);
            } else {
              setProfileImage(null);
            }
          } else {
            setUserName(auth.currentUser?.displayName ?? "");
            setProfileImage(null);
          }
        } catch (e) {
          console.warn("Error handling user snapshot:", e);
        }
      },
      (err) => {
        console.warn("Failed to listen to user doc:", err);
      }
    );

    return () => unsubscribe();
  }, [navigation]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const fetchTodayTasks = async () => {
      setLoadingTasks(true);
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setTodayTasks([]);
          setLoadingTasks(false);
          return;
        }
        const startOfDay = moment().startOf("day").toDate();
        const endOfDay = moment().endOf("day").toDate();
        const schedulesRef = collection(
          db,
          "users",
          currentUser.uid,
          "schedules"
        );
        // Remove the completed filter to show all tasks
        const q = query(
          schedulesRef,
          where("scheduledAt", ">=", startOfDay),
          where("scheduledAt", "<=", endOfDay),
          orderBy("scheduledAt", "asc")
        );
        unsubscribe = onSnapshot(q, (querySnapshot) => {
          const tasks = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTodayTasks(tasks);
          setLoadingTasks(false);
        });
      } catch (error) {
        setTodayTasks([]);
        setLoadingTasks(false);
        console.error("Error fetching today's tasks:", error);
      }
    };

    fetchTodayTasks();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Tab navigation
  const goToSchedule = () => {
    navigation.navigate("Schedule", { screen: "ScheduleList" });
  };

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
            <Text style={styles.hiText}>Hi!</Text>
            <Text style={styles.nameText}>{userName}</Text>
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
              source={
                profileImage
                  ? { uri: profileImage }
                  : require("../../../assets/profile.png")
              }
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
              <Text style={styles.statValue}>{bmi !== null ? bmi : "--"}</Text>
              <Text style={styles.statDesc}>{bmiDesc || "No health info"}</Text>
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
            {loadingTasks ? (
              <Text style={{ color: "#fff", padding: 20 }}>Loading...</Text>
            ) : todayTasks.length === 0 ? (
              <Text style={{ color: "#fff", padding: 20 }}>
                No schedule for today.
              </Text>
            ) : (
              todayTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskCard}
                  onPress={() => {
                    goToSchedule();
                  }}
                >
                  <View style={styles.taskTimeColumn}>
                    <Text style={styles.taskTime}>
                      {moment(
                        task.scheduledAt.seconds
                          ? task.scheduledAt.seconds * 1000
                          : task.scheduledAt
                      ).format("hh:mm A")}
                    </Text>
                  </View>
                  <View style={styles.taskContent}>
                    <View style={styles.taskHeader}>
                      <View style={styles.taskTitleContainer}>
                        <MaterialCommunityIcons
                          name={getTaskIcon(task.type || "workout")}
                          size={20}
                          color="#4a90e2"
                        />
                        <Text style={styles.taskTitle}>{task.title}</Text>
                      </View>
                      <MaterialCommunityIcons
                        name={
                          task.completed ? "check-circle" : "circle-outline"
                        }
                        size={24}
                        color={task.completed ? "#4CAF50" : "#8a84a5"}
                      />
                    </View>
                    <Text style={styles.taskDuration}>
                      {task.duration || ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Create Workout Button */}
        <TouchableOpacity
          style={styles.createWorkoutBtn}
          onPress={() =>
            navigation.navigate("Schedule", {
              screen: "CreateSchedule",
              params: { fromHome: true, resetKey: Date.now() },
            })
          }
        >
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
  profilePic: { width: 100, height: 100, borderRadius: 50 },
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
});

export default HomeScreen;
