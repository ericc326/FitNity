import React, { useState, useEffect, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import LoadingIndicator from "../../../components/LoadingIndicator";
import UserAvatar from "../../../components/UserAvatar";

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<HomeTabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

type Level = "Beginner" | "Intermediate" | "Advanced";

interface Exercise {
  id: string;
  name?: string;
  bodyPart: string;
  duration?: string;
  imageURL?: string;
  level: Level;
  instructions?: string[];
}

interface Task {
  id: string;
  title: string;
  type?: string;
  duration?: string;
  completed?: boolean;
  scheduledAt: any;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const scrollRef = useRef<ScrollView | null>(null);

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Health Info State
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiDesc, setBmiDesc] = useState<string>("");
  const [tdee, setTdee] = useState<string>("--");
  const [userLevel, setUserLevel] = useState<Level | null>(null);
  const [userGoal, setUserGoal] = useState<string>("Build Muscle");

  const [suggestedWorkouts, setSuggestedWorkouts] = useState<any[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      // On focus ensure top
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return undefined;
    }, [])
  );

  // Fetch User Info
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      navigation.navigate("Auth", { screen: "Login" });
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setUserName(data?.name ?? auth.currentUser?.displayName ?? "");

          const photo = data?.photoURL;
          setProfileImage(photo && typeof photo === "string" ? photo : null);
        }
      },
      (err) => console.warn("Failed to listen to user doc:", err)
    );

    return () => unsubscribe();
  }, [navigation]);

  // Fetch Health Info (Level & Goal)
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const healthInfoRef = collection(
      db,
      "users",
      currentUser.uid,
      "healthinfo"
    );
    const unsub = onSnapshot(
      healthInfoRef,
      (snapshot) => {
        if (snapshot.empty) {
          setTdee("--");
          return;
        }
        const data = snapshot.docs[0].data() as any;

        // Set BMI + description
        const bmiVal = data.bmi ?? null;
        setBmi(bmiVal);
        let desc = "";
        if (bmiVal === undefined || bmiVal === null) desc = "--";
        else if (bmiVal < 18.5) desc = "Underweight";
        else if (bmiVal < 25) desc = "You have a normal weight";
        else if (bmiVal < 30) desc = "Overweight";
        else desc = "Obese";
        setBmiDesc(desc);

        if (data.tdee) {
          setTdee(`${data.tdee} kcal`);
        } else {
          setTdee("--");
        }

        // ✅ CAPTURE LEVEL AND GOAL
        setUserLevel((data.level as Level) ?? "Beginner");
        setUserGoal(data.goal ?? "Build Muscle");
      },
      (err) => console.error("Healthinfo listener error:", err)
    );
    return () => unsub();
  }, []);

  // Fetch Today's Tasks
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

        const q = query(
          schedulesRef,
          where("scheduledAt", ">=", startOfDay),
          where("scheduledAt", "<=", endOfDay),
          where("completed", "==", false), // show only incomplete tasks
          orderBy("scheduledAt", "asc")
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          const list: Task[] = snapshot.docs.map((d) => ({
            ...(d.data() as Task),
            id: d.id,
          }));
          setTodayTasks(list);
          setLoadingTasks(false);
        });
      } catch (error) {
        console.error("Error fetching today's tasks:", error);
        setTodayTasks([]);
        setLoadingTasks(false);
      }
    };

    fetchTodayTasks();
    return () => unsubscribe && unsubscribe();
  }, []);

  // --- 1. COPY THE HEURISTIC ENGINE HERE ---
  const categorizeExercise = (exerciseName: string): string => {
    const name = exerciseName.toLowerCase();
    const advancedKeywords = [
      "one arm",
      "single leg",
      "unilateral",
      "stability ball",
      "bosu ball",
      "wheel roller",
      "olympic barbell",
      "kettlebell",
      "hammer",
      "tire",
      "sled",
      "weighted",
      "explosive",
      "plyo",
      "jump",
      "dragon flag",
    ];

    const beginnerKeywords = [
      "machine",
      "assisted",
      "smith",
      "cable",
      "elliptical",
      "bike",
      "stepmill",
      "ergometer",
      "band",
      "seated",
      "kneeling",
      "support",
      "leverage",
      "wall",
    ];

    if (advancedKeywords.some((key) => name.includes(key))) return "Advanced";
    if (beginnerKeywords.some((key) => name.includes(key))) return "Beginner";
    return "Intermediate";
  };

  // Fetch Suggested Workouts
  useEffect(() => {
    const fetchSuggestedWorkouts = async () => {
      if (!userLevel) return;
      setLoadingWorkouts(true);
      try {
        const exercisesRef = collection(db, "exercises");
        const snapshot = await getDocs(exercisesRef);

        const allExercises: Exercise[] = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              bodyPart: data.bodyParts?.[0] || "General",
              duration: "4",
              imageURL: data.gifUrl,
              level: userLevel,
              instructions: data.instructions || [],
            };
          })
          // 1. Remove Broken Images & Duplicates
          .filter((ex) => ex.imageURL && ex.imageURL.length > 5)
          .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)

          // 🚨 2. APPLY HEURISTIC FILTER HERE (The "Smart" Logic)
          .filter((ex) => {
            const difficulty = categorizeExercise(ex.name || "");

            // If Beginner, ONLY allow Beginner moves
            if (userLevel === "Beginner") return difficulty === "Beginner";

            // If Intermediate, allow Intermediate + Beginner
            if (userLevel === "Intermediate")
              return difficulty === "Intermediate" || difficulty === "Beginner";

            // If Advanced, allow EVERYTHING
            return true;
          });

        // 3. Group and Randomize (Same as before)
        const grouped: Record<string, Exercise[]> = {};
        allExercises.forEach((ex) => {
          if (!grouped[ex.bodyPart]) grouped[ex.bodyPart] = [];
          grouped[ex.bodyPart].push(ex);
        });

        const getRandom = (arr: Exercise[], count = 5) => {
          const shuffled = [...arr].sort(() => Math.random() - 0.5);
          return shuffled.slice(0, Math.min(count, arr.length));
        };

        const workouts = Object.entries(grouped)
          .map(([bodyPart, exercises]) => {
            // Get 4 to 6 exercises
            const set = getRandom(exercises, 4 + Math.floor(Math.random() * 2));

            const total = set.reduce(
              (sum, e) => sum + (e.duration ? parseInt(e.duration) : 10),
              0
            );

            if (set.length === 0) return null;

            return {
              title: `${bodyPart} ${userLevel}`,
              exercises: set, // <--- These are now GUARANTEED valid for the level
              duration: `${total} min`,
              image: set[0]?.imageURL ?? null,
            };
          })
          .filter(Boolean);

        setSuggestedWorkouts(workouts);
      } catch (error) {
        console.error("Error fetching exercises:", error);
        setSuggestedWorkouts([]);
      } finally {
        setLoadingWorkouts(false);
      }
    };
    fetchSuggestedWorkouts();
  }, [userLevel]);
  // Navigation functions
  const goToSchedule = () =>
    navigation.navigate("Schedule", { screen: "ScheduleList" });

  const goToScheduleDetail = (scheduleId: string) => {
    navigation.navigate("Schedule", {
      screen: "ScheduleDetail",
      params: { scheduleId, fromHome: true },
    });
  };

  const goToProfile = () => navigation.navigate("Profile");

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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hiText}>Hi!</Text>
            <Text style={styles.nameText}>{userName}</Text>

            <View style={styles.badgeRow}>
              <Text style={styles.badge}>{userLevel}</Text>
              <Text style={[styles.badge, styles.trainingBadge]}>
                {userGoal}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={goToProfile}>
            <UserAvatar uri={profileImage} size={100} />
          </TouchableOpacity>
        </View>

        {/* Statistics */}
        <View>
          <View style={styles.statisticsHeader}>
            <Text style={styles.statisticsSectionTitle}>Statistics</Text>
          </View>

          <View style={styles.statisticsContent}>
            <View style={styles.bmiBox}>
              <Text style={styles.statLabel}>BMI (Body Mass Index)</Text>
              <Text style={styles.statValue}>{bmi ?? "--"}</Text>
              <Text style={styles.statDesc}>{bmiDesc}</Text>
            </View>

            <View style={styles.calorieBox}>
              <Text style={styles.statLabel}>Est. Daily Cal. Burn</Text>
              <Text style={styles.statValue}>{tdee}</Text>
            </View>
          </View>
        </View>

        {/* Today's Schedule */}
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
                No pending schedules for today.
              </Text>
            ) : (
              todayTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskCard}
                  onPress={() => {
                    goToScheduleDetail(task.id);
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
                      {task.duration ? `${task.duration} duration` : ""}
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

        {/* Suggested Workouts */}
        <Text style={styles.sectionTitle}>Personalized Workouts</Text>

        {loadingWorkouts || !userLevel ? (
          <View style={{ height: 120, justifyContent: "center" }}>
            <LoadingIndicator />
          </View>
        ) : suggestedWorkouts.length === 0 ? (
          <Text style={{ color: "#fff", padding: 20 }}>
            No workouts available.
          </Text>
        ) : (
          suggestedWorkouts.map((workout, i) => (
            <View key={i} style={styles.workoutCard}>
              {workout.image && (
                <Image
                  source={{ uri: workout.image }}
                  style={styles.workoutImage}
                />
              )}

              <View style={styles.workoutInfo}>
                <Text style={styles.workoutTitle}>{workout.title}</Text>

                <Text style={styles.workoutMeta}>
                  ⏱ {workout.duration} • 🔥 {workout.exercises.length}{" "}
                  Exercises
                </Text>

                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() =>
                    // ✅ FIXED: Pass Level AND Goal to the Engine
                    navigation.navigate("Workout", {
                      screen: "RecommendationWorkout",
                      params: {
                        workout,
                        level: userLevel ?? "Beginner",
                        goal: userGoal, // Passing the real goal from Firebase
                      },
                    })
                  }
                >
                  <Text style={styles.viewBtnText}>View</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Chat Bot Icon */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => setShowChat(true)}
      >
        <MaterialCommunityIcons name="robot" size={30} color="#4a90e2" />
      </TouchableOpacity>

      <AIChatBox visible={showChat} onClose={() => setShowChat(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hiText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    paddingLeft: 10,
  },
  nameText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    paddingLeft: 10,
  },

  badgeRow: {
    flexDirection: "row",
    marginTop: 8,
    gap: 6,
    marginBottom: 20,
  },
  badge: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 12,
  },
  trainingBadge: {
    backgroundColor: "#f55",
  },
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
  statLabel: {
    color: "#fff",
    fontSize: 12,
  },
  statValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  statDesc: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
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
  },
  taskCard: {
    flexDirection: "row",
    backgroundColor: "#3C3952",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 280,
  },
  taskTimeColumn: {
    marginRight: 12,
  },
  taskTime: {
    color: "#8a84a5",
    fontSize: 14,
  },
  taskContent: { flex: 1 },
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
  createWorkoutText: {
    fontWeight: "bold",
  },
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
  workoutTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  workoutMeta: {
    color: "#ccc",
    fontSize: 12,
  },
  viewBtn: {
    backgroundColor: "#f57c00",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  viewBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  chatButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 30,
    elevation: 4,
  },
});

export default HomeScreen;
