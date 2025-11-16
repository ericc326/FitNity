import React, { useState } from "react";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import LoadingIndicator from "../../../components/LoadingIndicator";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutStackParamList } from "../navigation/WorkoutNavigator";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../../firebaseConfig";

type Props = NativeStackScreenProps<WorkoutStackParamList, "SelectExercise">;

const SelectExercise = ({ navigation }: Props) => {
  const route = useRoute() as any;
  const returnToCreate = !!route?.params?.returnToCreateSchedule;
  const returnToEdit = !!route?.params?.returnToEditSchedule;
  const scheduleId: string | undefined = route?.params?.scheduleId;
  const fromHome = !!route?.params?.fromHome;

  const [searchText, setSearchText] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null); //name of selected exercise
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null
  ); // id of selected exercise
  const [exerciseData, setExerciseData] = useState<any[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<any[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch exercises from Firestore
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      setSelectedExercise(null);
      setSelectedExerciseId(null);
      setSearchText("");
      setLoading(true);

      const fetchExercisesFromFirestore = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, "exercises"));
          const data = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          if (mounted) {
            setExerciseData(data);
            setFilteredExercises(data);

            const uniqueBodyParts = new Set<string>();
            data.forEach((item: any) => {
              if (Array.isArray(item.bodyParts)) {
                item.bodyParts.forEach((bp: string) => uniqueBodyParts.add(bp));
              } else if (typeof item.bodyPart === "string") {
                uniqueBodyParts.add(item.bodyPart);
              }
            });

            setBodyParts(["All", ...Array.from(uniqueBodyParts)]);
          }
        } catch (error) {
          console.error("Error fetching exercises from Firestore:", error);
          Alert.alert("Error", "Could not fetch exercises");
        } finally {
          if (mounted) setLoading(false);
        }
      };

      fetchExercisesFromFirestore();
      return () => {
        mounted = false;
      };
    }, [])
  );

  // Filter exercises by body part + search
  React.useEffect(() => {
    let filtered = exerciseData;

    if (selectedBodyPart && selectedBodyPart !== "All") {
      filtered = filtered.filter((ex: any) => {
        if (Array.isArray(ex.bodyParts)) {
          return ex.bodyParts.some(
            (bp: string) => bp.toLowerCase() === selectedBodyPart.toLowerCase()
          );
        } else if (typeof ex.bodyPart === "string") {
          return ex.bodyPart.toLowerCase() === selectedBodyPart.toLowerCase();
        }
        return false;
      });
    }

    if (searchText.trim()) {
      filtered = filtered.filter((ex: any) =>
        ex.name?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredExercises(filtered);
  }, [searchText, selectedBodyPart, exerciseData]);

  // Single-select toggle
  const toggleExerciseSelection = (
    exerciseName: string,
    exerciseId: string
  ) => {
    setSelectedExercise((prev) =>
      prev === exerciseName ? null : exerciseName
    );
    setSelectedExerciseId((prev) => (prev === exerciseId ? null : exerciseId));
  };

  // Add button handler
  const handleAddExercises = () => {
    if (!selectedExercise || !selectedExerciseId) {
      Alert.alert("No Selection", "Please select one exercise");
      return;
    }
    if (returnToCreate) {
      navigation.getParent()?.navigate("Schedule", {
        screen: "CreateSchedule",
        params: { selectedExercise, selectedExerciseId, fromHome },
      } as any);
    } else if (returnToEdit && scheduleId) {
      navigation.getParent()?.navigate("Schedule", {
        screen: "EditSchedule",
        params: { scheduleId, selectedExercise, selectedExerciseId },
      } as any);
    } else {
      navigation.goBack();
    }
  };

  const handleBack = () => {
    if (returnToCreate) {
      navigation.getParent()?.navigate("Schedule", {
        screen: "CreateSchedule",
        params: { fromHome },
      } as any);
    } else if (returnToEdit && scheduleId) {
      navigation.getParent()?.navigate("Schedule", {
        screen: "EditSchedule",
        params: { scheduleId },
      } as any);
    } else {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={30}
                color="white"
              />
            </TouchableOpacity>
            <Text style={styles.title}>Select Exercise</Text>
          </View>

          {/* Search */}
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
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {/* Body Part Filter Bar */}
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
                onPress={() =>
                  setSelectedBodyPart(selectedBodyPart === part ? null : part)
                }
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

        {/* EXERCISE LIST */}
        <FlatList
          data={filteredExercises}
          renderItem={({ item }) => {
            const isSelected = selectedExerciseId === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.exerciseItem,
                  isSelected && styles.selectedExercise,
                ]}
                onPress={() => toggleExerciseSelection(item.name, item.id)}
              >
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: item.gifUrl }}
                    style={styles.exerciseImage}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseText}>{item.name}</Text>
                  <Text style={styles.categoryText}>
                    {item.bodyParts?.join(", ") || item.bodyPart || "Unknown"}
                  </Text>
                </View>
                {isSelected && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color="#5A3BFF"
                  />
                )}
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        />

        {/* Fixed Add Button */}
        {selectedExerciseId && (
          <View style={styles.fixedAddContainer}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddExercises}
            >
              <Text style={styles.addButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#262135" },
  container: { flex: 1, backgroundColor: "#262135" },
  headerBlock: { paddingHorizontal: 20, paddingTop: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backButton: { paddingRight: 12, paddingVertical: 4 },
  title: { fontSize: 24, fontWeight: "bold", color: "white" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E2D",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, color: "white", height: 50, fontSize: 16 },
  filterContainer: { marginBottom: 10 },
  filterButton: {
    backgroundColor: "#1E1E2D",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
  },
  filterButtonActive: { backgroundColor: "#5A3BFF" },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E2D",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 16,
  },
  exerciseImage: { width: "100%", height: "100%" },
  exerciseText: { fontSize: 16, color: "white" },
  categoryText: { fontSize: 12, color: "#8E8E9E", marginTop: 4 },
  selectedExercise: { backgroundColor: "#2A2A3A" },
  fixedAddContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  addButton: {
    backgroundColor: "#5A3BFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  addButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
});

export default SelectExercise;
