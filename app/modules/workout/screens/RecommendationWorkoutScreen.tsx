import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutStackParamList } from "../navigation/WorkoutNavigator";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<
  WorkoutStackParamList,
  "RecommendationWorkout"
>;

// --- 1. HEURISTIC CLASSIFICATION LOGIC ---
const categorizeExercise = (exerciseName: string): string => {
  const name = exerciseName.toLowerCase();
  const advancedKeywords = [
    // Unilateral / Balance
    "one arm",
    "single leg",
    "unilateral",
    "stability ball",
    "bosu ball",
    "wheel roller",

    // Technical / Explosive Equipment
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
    // Machines (Fixed path = Safe)
    "machine",
    "assisted",
    "smith",
    "cable",
    "elliptical",
    "bike",
    "stepmill",
    "ergometer",

    // Low Impact / Supported
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

type PlanDetails = {
  sets: number;
  reps: number;
  rest: number;
};

const heuristicRules: Record<string, Record<string, PlanDetails>> = {
  "Build Muscle": {
    Beginner: { sets: 3, reps: 10, rest: 90 },
    Intermediate: { sets: 4, reps: 12, rest: 60 },
    Advanced: { sets: 5, reps: 15, rest: 60 },
  },
  "Lose Weight": {
    Beginner: { sets: 3, reps: 15, rest: 45 },
    Intermediate: { sets: 4, reps: 20, rest: 30 },
    Advanced: { sets: 5, reps: 25, rest: 30 },
  },
  "Increase Strength": {
    Beginner: { sets: 3, reps: 5, rest: 120 },
    Intermediate: { sets: 5, reps: 5, rest: 180 },
    Advanced: { sets: 6, reps: 3, rest: 240 },
  },
};

const RecommendationWorkoutScreen: React.FC<Props> = ({
  route,
  navigation,
}) => {
  const { workout, level, goal } = route.params;

  const userGoal = goal || "Build Muscle";
  const userLevel = level || "Beginner";

  // NEW: State for the Detail Modal
  const [selectedExercise, setSelectedExercise] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // --- 2. THE FILTERING ENGINE ---
  const personalizedExerciseList = useMemo(() => {
    const rawList = workout.exercises || [];
    const filtered = rawList.filter((ex: any) => {
      const difficulty = categorizeExercise(ex.name);
      if (userLevel === "Beginner") return difficulty === "Beginner";
      if (userLevel === "Intermediate")
        return difficulty === "Intermediate" || difficulty === "Beginner";
      return true;
    });
    return filtered.length > 0 ? filtered : rawList.slice(0, 4);
  }, [workout.exercises, userLevel]);

  const totalDuration = parseInt(workout.duration) || 30;
  const currentPlan =
    heuristicRules[userGoal]?.[userLevel] ||
    heuristicRules["Build Muscle"]["Beginner"];

  // --- 3. HANDLE EXERCISE CLICK ---
  const handleExercisePress = (exercise: any) => {
    setSelectedExercise(exercise);
    setModalVisible(true);
  };

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
            resizeMode="cover"
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
              <View style={styles.badgeRow}>
                <View style={styles.goalBadge}>
                  <Text style={styles.goalBadgeText}>{userGoal}</Text>
                </View>
                <Text style={styles.workoutSubtitle}>
                  {userLevel} • {totalDuration} Min
                </Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.planSummaryContainer}>
            <Text style={styles.sectionTitle}>AI Personalization Details</Text>
            <Text style={styles.engineDescription}>
              Based on your level and your goal to{" "}
              <Text style={{ fontWeight: "bold", color: "#7b68ee" }}>
                {userGoal}
              </Text>
              , we have filtered {personalizedExerciseList.length} suitable
              exercises and adjusted intensity:
            </Text>
            <View style={styles.planBadgesRow}>
              <View style={styles.badge}>
                <MaterialCommunityIcons
                  name="repeat"
                  size={16}
                  color="#fff"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.badgeText}>{currentPlan.sets} Sets</Text>
              </View>
              <View style={styles.badge}>
                <MaterialCommunityIcons
                  name="arm-flex"
                  size={16}
                  color="#fff"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.badgeText}>{currentPlan.reps} Reps</Text>
              </View>
              <View style={styles.badge}>
                <MaterialCommunityIcons
                  name="timer-outline"
                  size={16}
                  color="#fff"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.badgeText}>{currentPlan.rest}s Rest</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Personalized Exercise List</Text>

          {personalizedExerciseList.map((exercise: any, index: number) => (
            // ✅ CHANGED TO TouchableOpacity
            <TouchableOpacity
              key={exercise.id || index}
              style={styles.exerciseCard}
              onPress={() => handleExercisePress(exercise)}
            >
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
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#444"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* --- EXERCISE DETAIL MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Exercise Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedExercise && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Large GIF/Image */}
                <Image
                  source={{
                    uri:
                      selectedExercise.imageURL ||
                      "https://media.giphy.com/media/3o7TKs2baF37k74k9O/giphy.gif",
                  }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />

                <Text style={styles.modalExerciseName}>
                  {selectedExercise.name}
                </Text>

                {/* Meta Tags */}
                <View style={styles.modalMetaRow}>
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaText}>
                      {selectedExercise.bodyPart}
                    </Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaText}>
                      {categorizeExercise(selectedExercise.name)}
                    </Text>
                  </View>
                </View>

                {/* Instructions Section */}
                <Text style={styles.modalSectionTitle}>Instructions</Text>

                {selectedExercise.instructions &&
                selectedExercise.instructions.length > 0 ? (
                  // 1. If Firebase has instructions, map through them
                  selectedExercise.instructions.map(
                    (inst: string, idx: number) => (
                      <View key={idx} style={styles.instructionRow}>
                        <Text style={styles.instructionNumber}>{idx + 1}.</Text>
                        <Text style={styles.instructionText}>{inst}</Text>
                      </View>
                    )
                  )
                ) : (
                  // 2. Fallback for safety if database is empty
                  <Text style={styles.instructionText}>
                    Perform this exercise with controlled movement. Focus on
                    form over weight.
                  </Text>
                )}

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default RecommendationWorkoutScreen;

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#262135" },
  container: { flex: 1, backgroundColor: "#262135" },
  headerContainer: { height: 250, width: "100%", position: "relative" },
  headerImage: { width: "100%", height: "100%" },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "space-between",
    padding: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  headerTextContainer: { marginBottom: 10 },
  workoutTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  goalBadge: {
    backgroundColor: "#7b68ee",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  goalBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  workoutSubtitle: { color: "#e0e0e0", fontSize: 14, fontWeight: "600" },
  contentContainer: { flex: 1, padding: 20 },
  planSummaryContainer: {
    marginBottom: 30,
    backgroundColor: "#2b263d",
    padding: 15,
    borderRadius: 12,
  },
  engineDescription: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 15,
    lineHeight: 18,
  },
  planBadgesRow: { flexDirection: "row", justifyContent: "space-between" },
  badge: {
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    flex: 0.31,
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
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
  exerciseInfo: { flex: 1 },
  exerciseName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  exerciseDetails: { color: "#aaa", fontSize: 13 },

  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1E1E2D",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%", // Takes up most of the screen
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  modalImage: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  modalExerciseName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalMetaRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  metaBadge: {
    backgroundColor: "#35354a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 10,
  },
  metaText: {
    color: "#ccc",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  modalSectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 10,
  },
  instructionRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  instructionNumber: {
    color: "#7b68ee",
    fontWeight: "bold",
    marginRight: 10,
    marginTop: 2,
  },
  instructionText: {
    color: "#ccc",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  closeButton: {
    backgroundColor: "#7b68ee",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
