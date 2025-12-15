import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutStackParamList } from "../navigation/WorkoutNavigator";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<
  WorkoutStackParamList,
  "RecommendationWorkout"
>;

type PlanDetails = {
  sets: number;
  reps: number;
  rest: number;
};

type WorkoutPlan = {
  [key: string]: PlanDetails;
};

const plans: WorkoutPlan = {
  Beginner: { sets: 3, reps: 8, rest: 90 },
  Intermediate: { sets: 4, reps: 10, rest: 60 },
  Advanced: { sets: 5, reps: 12, rest: 45 },
};

const RecommendationWorkoutScreen: React.FC<Props> = ({
  route,
  navigation,
}) => {
  const { workout, level } = route.params;
  const exerciseList = workout.exercises || [];
  const totalDuration = parseInt(workout.duration) || 30;
  const currentPlan = plans[level] || plans["Beginner"];

  return (
    <SafeAreaView
      style={styles.safeContainer}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Image
            source={{
              uri:
                workout.image ||
                "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1350&q=80",
            }}
            style={styles.headerImage}
            resizeMode="contain"
          />
          <View style={[styles.headerOverlay]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.getParent()?.navigate("Home")}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.workoutTitle}>{workout.title}</Text>
              <Text style={styles.workoutSubtitle}>
                {level} Level • {totalDuration} Min • {exerciseList.length}{" "}
                Exercises
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.planSummaryContainer}>
            <Text style={styles.sectionTitle}>Plan Details</Text>
            <View style={styles.planBadgesRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{currentPlan.sets} Sets</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{currentPlan.reps} Reps</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{currentPlan.rest}s Rest</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Exercises</Text>

          {exerciseList.map((exercise: any, index: number) => (
            <View key={exercise.id || index} style={styles.exerciseCard}>
              <Image
                source={{
                  uri:
                    exercise.imageURL ||
                    "https://media.giphy.com/media/3o7TKs2baF37k74k9O/giphy.gif",
                }}
                style={styles.exerciseImage}
              />
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseDetails}>
                  {exercise.bodyPart} • {currentPlan.sets} Sets x{" "}
                  {currentPlan.reps} Reps
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default RecommendationWorkoutScreen;

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#262135",
  },
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  headerContainer: {
    height: 250,
    width: "100%",
    position: "relative",
  },
  headerImage: {
    width: "100%",
    height: "100%",
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "space-between",
    padding: 20,
    alignItems: "flex-start",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  headerTextContainer: {
    marginBottom: 10,
  },
  workoutTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
  },
  workoutSubtitle: {
    color: "#e0e0e0",
    fontSize: 14,
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  planSummaryContainer: {
    marginBottom: 20,
  },
  planBadgesRow: {
    flexDirection: "row",
    gap: 10,
  },
  badge: {
    backgroundColor: "#4CAF50",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  exerciseCard: {
    flexDirection: "row",
    backgroundColor: "#2b263d",
    borderRadius: 12,
    marginBottom: 15,
    padding: 12,
    alignItems: "center",
  },
  exerciseImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: "#3a3550",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  exerciseDetails: {
    color: "#aaa",
    fontSize: 13,
  },
});
