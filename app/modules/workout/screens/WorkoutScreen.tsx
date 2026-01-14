// WorkoutScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { WorkoutStackParamList } from "../navigation/WorkoutNavigator";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db, auth } from "../../../../firebaseConfig";
import { LineChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

export interface Exercise {
  exerciseId?: string;
  name: string;
  bodyParts?: string[];
  equipments?: string[];
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  gifUrl?: string;
  instructions?: string[];
}

interface ProgressItem {
  id: string;
  exercise: string;
  weight: string;
  startingBest: number;
  currentBest: number;
}

const WorkoutScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<WorkoutStackParamList>>();

  const [activeTab, setActiveTab] = useState<"exercise" | "progress">(
    "exercise"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );

  // Filter States (Matching SelectExercise Logic)
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>("All");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("All");
  const [equipments, setEquipments] = useState<string[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);

  const [dynamicProgress, setDynamicProgress] = useState<ProgressItem[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  // Fetch Exercises and dynamically build filter lists
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const exercisesRef = collection(db, "exercises");
      const snapshot = await getDocs(exercisesRef);

      const allExercises: Exercise[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as any),
        exerciseId: doc.id,
      }));

      const partsSet = new Set<string>(["All"]);
      const equipSet = new Set<string>(["All"]);

      allExercises.forEach((ex) => {
        if (Array.isArray(ex.bodyParts))
          ex.bodyParts.forEach((p) => partsSet.add(p));
        if (Array.isArray(ex.equipments))
          ex.equipments.forEach((e) => equipSet.add(e));
      });

      setExercises(allExercises);
      setBodyParts(Array.from(partsSet));
      setEquipments(Array.from(equipSet));
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === "progress") {
      fetchProgressFromFirebase();
    }
  }, [activeTab]);

  // Combined Filtering Logic
  const filteredExercises = exercises.filter((item: Exercise) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesBodyPart =
      selectedBodyPart === "All" || item.bodyParts?.includes(selectedBodyPart);
    const matchesEquipment =
      selectedEquipment === "All" ||
      item.equipments?.includes(selectedEquipment);
    return matchesSearch && matchesBodyPart && matchesEquipment;
  });

  const calculateGrowth = (start: number, current: number) => {
    if (start === 0) return "N/A";
    const growth = ((current - start) / start) * 100;
    return `${growth >= 0 ? "+" : ""}${Math.round(growth)}%`;
  };

  const fetchProgressFromFirebase = async () => {
    if (!auth.currentUser) return;
    setProgressLoading(true);
    try {
      const q = query(
        collection(db, "users", auth.currentUser.uid, "schedules"),
        orderBy("scheduledAt", "asc")
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setDynamicProgress([]);
        return;
      }
      const allSchedules = snapshot.docs.map((doc) => doc.data());
      const exerciseGroups: { [key: string]: any[] } = {};
      allSchedules.forEach((item) => {
        const title = item.selectedWorkoutName || "Unknown Exercise";
        if (!exerciseGroups[title]) exerciseGroups[title] = [];
        exerciseGroups[title].push(item);
      });

      const progressItems: ProgressItem[] = Object.keys(exerciseGroups).map(
        (title, index) => {
          const logs = exerciseGroups[title];
          const firstEntry = logs[0];
          const latestEntry = logs[logs.length - 1];
          return {
            id: index.toString(),
            exercise: title,
            weight: latestEntry.weightLifted || "Bodyweight",
            startingBest: firstEntry.customReps || 0,
            currentBest: latestEntry.customReps || 0,
          };
        }
      );
      setDynamicProgress(progressItems);
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setProgressLoading(false);
    }
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={styles.exerciseItem}
      onPress={() => setSelectedExercise(item)}
    >
      <View style={styles.imageContainer}>
        {item.gifUrl ? (
          <Image
            source={{ uri: item.gifUrl }}
            style={styles.exerciseImage}
            resizeMode="cover"
          />
        ) : (
          <MaterialCommunityIcons
            name="dumbbell"
            size={40}
            color="#5A3BFF"
            style={{ alignSelf: "center", marginTop: 10 }}
          />
        )}
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        {/* UPDATED: Now shows Body Parts and Equipment exactly like SelectExercise */}
        <Text style={styles.exerciseMeta}>
          {item.bodyParts?.join(", ") || "Body"} |{" "}
          {item.equipments?.join(", ") || "No Equipment"}
        </Text>
      </View>
    </TouchableOpacity>
  );
  /* ===================== PROGRESS CHART LOGIC ===================== */
  const renderProgressChart = () => {
    // Only show if we have data to display
    if (dynamicProgress.length === 0) return null;

    const data = {
      // Shorten exercise names for the X-axis so they don't overlap
      labels: dynamicProgress.map((item) => item.exercise.substring(0, 6)),
      datasets: [
        {
          data: dynamicProgress.map((item) => item.startingBest),
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, // Starting Best in White
          strokeWidth: 2,
        },
        {
          data: dynamicProgress.map((item) => item.currentBest),
          color: (opacity = 1) => `rgba(90, 59, 255, ${opacity})`, // Current Best in Purple
          strokeWidth: 2,
        },
      ],
      legend: ["Starting Reps", "Current Reps"],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Performance Growth</Text>
        <LineChart
          data={data}
          width={width - 40}
          height={220}
          chartConfig={{
            backgroundColor: "#262135",
            backgroundGradientFrom: "#2a2a3a",
            backgroundGradientTo: "#262135",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: { r: "6", strokeWidth: "2", stroke: "#5A3BFF" },
          }}
          bezier // Smooth curved lines for professional UX
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      </View>
    );
  };

  const renderProgressItem = ({ item }: { item: ProgressItem }) => (
    <View style={styles.progressRow}>
      <Text style={[styles.cell, { flex: 1.2 }]}>{item.exercise}</Text>
      <Text style={styles.cell}>{item.weight}</Text>
      <Text style={styles.cell}>{item.startingBest}</Text>
      <Text style={styles.cell}>{item.currentBest}</Text>
      <Text style={[styles.cell, styles.growthCell]}>
        {calculateGrowth(item.startingBest, item.currentBest)}
      </Text>
    </View>
  );

  if (selectedExercise) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#262135" }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedExercise(null)}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
            <Text style={styles.backText}>Back to Library</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.exerciseTitle}>{selectedExercise.name}</Text>

          {/* GIF / Image */}
          {selectedExercise.gifUrl && (
            <View style={styles.videoContainer}>
              <Image
                source={{ uri: selectedExercise.gifUrl }}
                style={{ width: "100%", height: 250, borderRadius: 16 }}
              />
            </View>
          )}

          {/* META INFO ROW (Chips instead of vertical list) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: 20, marginBottom: 20 }}
          >
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Target:</Text>
              <Text style={styles.metaValue}>
                {(selectedExercise.targetMuscles || [])[0] || "General"}
              </Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Equip:</Text>
              <Text style={styles.metaValue}>
                {(selectedExercise.equipments || [])[0] || "None"}
              </Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Body:</Text>
              <Text style={styles.metaValue}>
                {(selectedExercise.bodyParts || [])[0] || "Full"}
              </Text>
            </View>
          </ScrollView>

          {/* IMPROVED INSTRUCTIONS SECTION */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.sectionTitle}>How to Perform</Text>

            {(selectedExercise.instructions || []).map((step, index) => (
              <View key={index} style={styles.instructionRow}>
                {/* Step Number Circle */}
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                </View>

                {/* Step Text */}
                <View style={styles.stepContent}>
                  <Text style={styles.instructionText}>{step}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "exercise" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("exercise")}
        >
          <Text style={styles.tabText}>Exercise</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "progress" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("progress")}
        >
          <Text style={styles.tabText}>Progress</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "exercise" ? (
        <>
          {/* SEARCH & FILTER HEADER */}
          <View style={styles.headerBlock}>
            <View style={styles.searchRow}>
              <View style={styles.searchContainer}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={24}
                  color="#8E8E9E"
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search exercises..."
                  placeholderTextColor="#8E8E9E"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* FILTER BUTTON (Identical to SelectExercise) */}
              <TouchableOpacity
                style={[
                  styles.filterIconButton,
                  (selectedBodyPart !== "All" || selectedEquipment !== "All") &&
                    styles.activeFilterIcon,
                ]}
                onPress={() => setIsFilterVisible(true)}
              >
                <MaterialCommunityIcons
                  name="filter-variant"
                  size={26}
                  color="white"
                />
              </TouchableOpacity>

              {/* AI Coach Button */}
              <TouchableOpacity
                style={styles.aiCoachMainButton}
                onPress={() => navigation.navigate("AiCoach")}
              >
                <MaterialCommunityIcons name="robot" size={18} color="white" />
                <Text style={styles.aiCoachMainText}>Coach</Text>
              </TouchableOpacity>
            </View>

            {/* Active Filters Display */}
            {(selectedBodyPart !== "All" || selectedEquipment !== "All") && (
              <Text style={styles.activeFiltersText}>
                Active: {selectedBodyPart !== "All" ? selectedBodyPart : ""}
                {selectedBodyPart !== "All" && selectedEquipment !== "All"
                  ? " + "
                  : ""}
                {selectedEquipment !== "All" ? selectedEquipment : ""}
              </Text>
            )}
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#5A3BFF"
              style={{ flex: 1 }}
            />
          ) : (
            <FlatList
              data={filteredExercises}
              renderItem={renderExerciseItem}
              keyExtractor={(item) => item.exerciseId || item.name}
              contentContainerStyle={styles.exerciseList}
              ListEmptyComponent={
                <Text style={styles.emptyStateText}>
                  No exercises found matching filters.
                </Text>
              }
            />
          )}
        </>
      ) : (
        <ScrollView>
          {renderProgressChart()}
          <View style={styles.progressSection}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingRight: 20,
              }}
            >
              <Text style={styles.muscleGroupTitle}>Your Progress</Text>
              {progressLoading && <ActivityIndicator color="#5A3BFF" />}
            </View>
            <View style={styles.progressTable}>
              <View style={styles.progressHeaderRow}>
                <Text style={[styles.headerCell, { flex: 1.2 }]}>Exercise</Text>
                <Text style={styles.headerCell}>Weight</Text>
                <Text style={styles.headerCell}>Start</Text>
                <Text style={styles.headerCell}>Current</Text>
                <Text style={styles.headerCell}>Growth</Text>
              </View>
              {dynamicProgress.length > 0 ? (
                dynamicProgress.map((item) => (
                  <View key={item.id}>{renderProgressItem({ item })}</View>
                ))
              ) : (
                <Text style={styles.emptyStateText}>
                  No workout history found yet.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* FILTER MODAL (Identical to SelectExercise) */}
      <Modal visible={isFilterVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Refine Results</Text>
              <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.filterLabel}>Target Muscle Group</Text>
              <View style={styles.chipContainer}>
                {bodyParts.map((part) => (
                  <TouchableOpacity
                    key={part}
                    style={[
                      styles.chip,
                      selectedBodyPart === part && styles.activeChip,
                    ]}
                    onPress={() => setSelectedBodyPart(part)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedBodyPart === part && styles.activeChipText,
                      ]}
                    >
                      {part}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.filterLabel, { marginTop: 20 }]}>
                Equipment Needed
              </Text>
              <View style={styles.chipContainer}>
                {equipments.map((eq) => (
                  <TouchableOpacity
                    key={eq}
                    style={[
                      styles.chip,
                      selectedEquipment === eq && styles.activeChip,
                    ]}
                    onPress={() => setSelectedEquipment(eq)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedEquipment === eq && styles.activeChipText,
                      ]}
                    >
                      {eq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setIsFilterVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#262135", paddingTop: 60 },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#2a2a3a",
  },
  tabButton: { flex: 1, paddingVertical: 15, alignItems: "center" },
  activeTab: { backgroundColor: "#5A3BFF" },
  tabText: { color: "white", fontWeight: "bold", fontSize: 16 },
  headerBlock: { marginHorizontal: 20, marginBottom: 15 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E2D",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: "white", fontSize: 16 },
  filterIconButton: {
    backgroundColor: "#1E1E2D",
    padding: 10,
    borderRadius: 12,
  },
  activeFilterIcon: { backgroundColor: "#5A3BFF" },
  activeFiltersText: {
    color: "#5A3BFF",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
  },
  aiCoachMainButton: {
    flexDirection: "row",
    backgroundColor: "#5A3BFF",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  aiCoachMainText: {
    color: "white",
    marginLeft: 5,
    fontSize: 14,
    fontWeight: "bold",
  },
  exerciseList: { paddingHorizontal: 20, paddingBottom: 20 },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a3a",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 15,
  },
  exerciseImage: { width: "100%", height: "100%" },
  textContainer: { flex: 1 },
  exerciseName: { color: "white", fontSize: 18, fontWeight: "bold" },
  exerciseMeta: { color: "#aaa", fontSize: 12, marginTop: 2 },
  backButton: { flexDirection: "row", alignItems: "center", padding: 20 },
  backText: { color: "white", marginLeft: 10, fontSize: 16 },
  exerciseTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginBottom: 5,
  },
  videoContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    overflow: "hidden",
    height: 250,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  descriptionText: { color: "#aaa", marginHorizontal: 20, lineHeight: 22 },
  emptyStateText: {
    color: "#888",
    textAlign: "center",
    fontSize: 16,
    marginTop: 20,
  },
  progressSection: { marginBottom: 25 },
  muscleGroupTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 20,
    marginBottom: 15,
  },
  progressTable: { minWidth: width - 30, paddingHorizontal: 15 },
  progressHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#2a2a3a",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a3a",
  },
  headerCell: {
    flex: 1,
    color: "#888",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 12,
  },
  cell: { flex: 1, color: "white", textAlign: "center", fontSize: 12 },
  growthCell: { color: "#4CAF50", fontWeight: "bold" },
  chartContainer: { marginHorizontal: 20, marginTop: 10, alignItems: "center" },
  chartTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginBottom: 10,
  },

  /* MODAL STYLES (MATCHING SELECT EXERCISE) */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#262135",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  filterLabel: {
    color: "#8E8E9E",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#1E1E2D",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  activeChip: { backgroundColor: "#5A3BFF", borderColor: "#5A3BFF" },
  chipText: { color: "#aaa", fontSize: 13 },
  activeChipText: { color: "white", fontWeight: "bold" },
  applyButton: {
    backgroundColor: "#5A3BFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 25,
  },
  applyButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },

  metaBadge: {
    flexDirection: "row",
    backgroundColor: "#35354a", // Lighter than background
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  metaLabel: {
    color: "#8E8E9E",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
    textTransform: "uppercase",
  },
  metaValue: {
    color: "white",
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  instructionsContainer: {
    backgroundColor: "#1E1E2D", // Card background for instructions
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    marginTop: 10,
    minHeight: 400, // Ensure it fills bottom
  },
  instructionRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#5A3BFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    marginTop: 2, // Align with top of text
  },
  stepNumber: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  instructionText: {
    color: "#E0E0E0", // Brighter text for readability
    fontSize: 15,
    lineHeight: 24, // Better spacing between lines
  },
});

export default WorkoutScreen;
