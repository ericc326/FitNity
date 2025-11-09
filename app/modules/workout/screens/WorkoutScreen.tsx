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
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { WorkoutStackParamList } from "../navigation/WorkoutNavigator";
import { SafeAreaView } from "react-native-safe-area-context";

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
  category: string;
  weight: string;
  startingBest: number;
  currentBest: number;
}

const progressData: ProgressItem[] = [
  {
    id: "1",
    exercise: "Push Ups",
    category: "Chest",
    weight: "Body Weight",
    startingBest: 30,
    currentBest: 42,
  },
  {
    id: "2",
    exercise: "Squats",
    category: "Legs",
    weight: "80kg",
    startingBest: 6,
    currentBest: 10,
  },
];

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
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>("All");
  const allBodyPartsList = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];
  const [bodyParts, setBodyParts] = useState<string[]>(allBodyPartsList);


const fetchExercises = async (bodyPart: string = "All") => {
  setLoading(true);
  try {
    let url = "";

    if (bodyPart === "All") {
      // random 100 exercises
      const randomOffset = Math.floor(Math.random() * 1400);
      url = `https://exercisedb-api.vercel.app/api/v1/exercises?limit=100&offset=${randomOffset}`;
    } else {
      // fetch exercises for a specific body part
      url = `https://exercisedb-api.vercel.app/api/v1/exercises/bodyPart/${bodyPart.toLowerCase()}`;
    }

    const response = await fetch(url);
    const json = await response.json();
    console.log("Fetched exercises:", json);

    if (!json.data || !Array.isArray(json.data)) {
      setExercises([]);
      return;
    }

    setExercises(json.data);
  } catch (error) {
    console.error("Error fetching exercises:", error);
    setExercises([]);
  } finally {
    setLoading(false);
  }
};

const handleBodyPartPress = (part: string) => {
  setSelectedBodyPart(part);
  fetchExercises(part);
};

  useEffect(() => {
    fetchExercises();
  }, []);


const filteredExercises = exercises.filter((item: Exercise) => {
  const matchesSearch = item.name
    .toLowerCase()
    .includes(searchQuery.toLowerCase());

  const matchesBodyPart =
    selectedBodyPart === "All" || item.bodyParts?.includes(selectedBodyPart);

  return matchesSearch && matchesBodyPart;
});

  
  const calculateGrowth = (start: number, current: number) => {
    const growth = ((current - start) / start) * 100;
    return `${growth >= 0 ? "+" : ""}${Math.round(growth)}%`;
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
        <Text style={styles.exerciseMeta}>
          {item.bodyParts || "Unknown part"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderProgressItem = ({ item }: { item: ProgressItem }) => (
    <View style={styles.progressRow}>
      <Text style={styles.cell}>{item.exercise}</Text>
      <Text style={styles.cell}>{item.weight}</Text>
      <Text style={styles.cell}>{item.startingBest}</Text>
      <Text style={styles.cell}>{item.currentBest}</Text>
      <Text style={[styles.cell, styles.growthCell]}>
        {calculateGrowth(item.startingBest, item.currentBest)}
      </Text>
    </View>
  );

// ✅ Exercise Detail View
if (selectedExercise) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#262135" }}>
      <ScrollView>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedExercise(null)}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          <Text style={styles.backText}>Back to Exercises</Text>
        </TouchableOpacity>

        <Text style={styles.exerciseTitle}>{selectedExercise.name}</Text>

        {selectedExercise.gifUrl && (
          <View style={styles.videoContainer}>
            <Image
              source={{ uri: selectedExercise.gifUrl }}
              style={{ width: "100%", height: 250, borderRadius: 10 }}
            />
          </View>
        )}

{/* ✅ Exercise Details Section */}
<View style={{ marginHorizontal: 20, marginTop: 10 }}>
  <Text style={styles.sectionTitle}>🎯 Target Muscles</Text>
  <Text style={styles.descriptionText}>
    {(selectedExercise.targetMuscles || []).join(", ") || "No details available"}
  </Text>

  <Text style={styles.sectionTitle}>💪 Body Parts</Text>
  <Text style={styles.descriptionText}>
    {(selectedExercise.bodyParts || []).join(", ") || "No details available"}
  </Text>

  <Text style={styles.sectionTitle}>🏋️ Equipment</Text>
  <Text style={styles.descriptionText}>
    {(selectedExercise.equipments || []).join(", ") || "No details available"}
  </Text>

  <Text style={styles.sectionTitle}>📋 Instructions</Text>
  {selectedExercise.instructions && selectedExercise.instructions.length > 0 ? (
    selectedExercise.instructions.map((step, index) => (
      <Text key={index} style={[styles.descriptionText, { marginBottom: 5 }]}>
        {step}
      </Text>
    ))
  ) : (
    <Text style={styles.descriptionText}>No instructions available.</Text>
  )}

  <TouchableOpacity style={styles.aiCoachButton}>
    <MaterialCommunityIcons name="robot" size={24} color="white" />
    <Text style={styles.aiCoachText}>Analyze with AI Coach</Text>
  </TouchableOpacity>
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

      {/* Exercise Tab */}
      {activeTab === "exercise" ? (
        <>
{/* Search + Body Part Filter */}
          <View style={{ marginHorizontal: 20, marginBottom: 10 }}>
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons
                name="magnify"
                size={24}
                color="#888"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises..."
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Body Part Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterContainer}
            >
{bodyParts.map((part) => (
  <TouchableOpacity
    key={part}
    style={[
      styles.filterButton,
      selectedBodyPart === part && styles.filterButtonActive,
    ]}
    onPress={() => handleBodyPartPress(part)}
  >
    <Text
      style={{
        color: selectedBodyPart === part ? "white" : "#aaa",
        fontWeight: "bold",
      }}
    >
      {part}
    </Text>
  </TouchableOpacity>
))}

            </ScrollView>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#5A3BFF" style={{ flex: 1 }} />
          ) : filteredExercises.length > 0 ? (
            <FlatList
              data={filteredExercises}
              renderItem={renderExerciseItem}
              keyExtractor={(item) => item.exerciseId || item.name}
              contentContainerStyle={styles.exerciseList}
            />
          ) : (
            <Text style={styles.emptyStateText}>No exercises found.</Text>
          )}
        </>
      ) : (
        // Progress Tab
        <ScrollView>
          <View style={styles.progressSection}>
            <Text style={styles.muscleGroupTitle}>Your Progress</Text>
            <View style={styles.progressTable}>
              <View style={styles.progressHeaderRow}>
                <Text style={[styles.headerCell, { flex: 1.2 }]}>Exercise</Text>
                <Text style={styles.headerCell}>Weight</Text>
                <Text style={styles.headerCell}>Start</Text>
                <Text style={styles.headerCell}>Current</Text>
                <Text style={styles.headerCell}>Growth</Text>
              </View>

              {progressData.map((item) => (
                <View key={item.id}>{renderProgressItem({ item })}</View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

// --- styles (same as before) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1c2e",
    paddingTop: 80,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#2a2a3a",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#5A3BFF",
  },
  tabText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a3a",
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  videoContainer: {
  marginHorizontal: 20,
  marginBottom: 20,
  borderRadius: 10,
  overflow: "hidden",
  height: 250, // same height used above
},

  searchInput: {
    flex: 1,
    color: "white",
    height: 50,
  },
    filterContainer: {
    flexDirection: "row",
    marginTop: 10,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#2a2a3a",
    borderRadius: 20,
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: "#5A3BFF",
  },
  exerciseList: {
    paddingHorizontal: 20,
  },
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
  exerciseImage: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    flex: 1,
  },
  exerciseName: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  exerciseMeta: {
    color: "#aaa",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  backText: {
    color: "white",
    marginLeft: 10,
    fontSize: 16,
  },
  exerciseTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginBottom: 5,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  descriptionText: {
    color: "#aaa",
    marginHorizontal: 20,
    lineHeight: 22,
  },
  aiCoachButton: {
    flexDirection: "row",
    backgroundColor: "#5A556B",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    marginTop: 30,
  },
  aiCoachText: {
    color: "white",
    marginLeft: 10,
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyStateText: {
    color: "#888",
    textAlign: "center",
    fontSize: 16,
  },
  progressSection: {
    marginBottom: 25,
  },
  muscleGroupTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 20,
    marginBottom: 15,
  },
  progressTable: {
    minWidth: Dimensions.get("window").width - 30,
  },
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
  },
  cell: {
    flex: 1,
    color: "white",
    textAlign: "center",
  },
  growthCell: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
});

export default WorkoutScreen;
