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
  ActivityIndicator,
} from "react-native";
import LoadingIndicator from "../../../components/LoadingIndicator";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutStackParamList } from "../navigation/WorkoutNavigator";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<WorkoutStackParamList, "SelectExercise">;

const SelectExercise = ({ navigation }: Props) => {
  // ...existing state...
  const route = useRoute() as any;
  const returnToCreate = !!route?.params?.returnToCreateSchedule;
  const [searchText, setSearchText] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [exerciseData, setExerciseData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Reset and refetch when screen is focused so previous selections are cleared and list refreshes
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      setSelectedExercises([]);
      setSearchText("");
      setLoading(true);
      setExerciseData([]);

      const fetchExercises = async () => {
        try {
          const randomOffset = Math.floor(Math.random() * 1400);
          const response = await fetch(
            `https://exercisedb-api.vercel.app/api/v1/exercises?limit=100&offset=${randomOffset}`,
          );
          const json = await response.json();
          if (!mounted) return;
          if (json && Array.isArray(json)) {
            // some endpoints return array directly
            setExerciseData(json);
          } else if (json && Array.isArray((json as any).data)) {
            setExerciseData((json as any).data);
          } else {
            console.error("Invalid data format:", json);
            Alert.alert("Error", "Failed to load exercise data");
          }
        } catch (error) {
          if (!mounted) return;
          console.error("Error fetching exercises:", error);
          Alert.alert("Error", "Could not fetch exercises");
        } finally {
          if (mounted) setLoading(false);
        }
      };

      fetchExercises();
      return () => {
        mounted = false;
      };
    }, []),
  );

  // Filter by search
  const filteredExercises = exerciseData.filter((exercise) =>
    exercise.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const toggleExerciseSelection = (exerciseName: string) => {
    setSelectedExercises((prev) =>
      prev.includes(exerciseName)
        ? prev.filter((name) => name !== exerciseName)
        : [...prev, exerciseName],
    );
  };

  const handleAddExercises = () => {
    if (selectedExercises.length === 0) {
      Alert.alert("No Selection", "Please select at least one exercise");
      return;
    }
    if (returnToCreate) {
      // navigate back into Schedule stack -> CreateSchedule with selectedExercises
      navigation.getParent()?.navigate("Schedule", {
        screen: "CreateSchedule",
        params: { selectedExercises },
      } as any);
      return;
    }
  };

  const handleBack = () => {
    if (returnToCreate) {
      navigation.getParent()?.navigate("Schedule", {
        screen: "CreateSchedule",
      } as any);
    } else {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Fixed header: title, search and filters (does not scroll) */}
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              accessibilityLabel="Back"
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={30}
                color="white"
              />
            </TouchableOpacity>
            <Text style={styles.title}>Select Exercise</Text>
          </View>

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

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => navigation.navigate("FilterExercise")}
            >
              <MaterialCommunityIcons
                name="filter-variant"
                size={20}
                color="#5A3BFF"
              />
              <Text style={styles.filterButtonText}>Filter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable list only */}
        <FlatList
          data={filteredExercises}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.exerciseItem,
                selectedExercises.includes(item.name) &&
                  styles.selectedExercise,
              ]}
              onPress={() => toggleExerciseSelection(item.name)}
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
                  {item.bodyParts ? item.bodyParts.join(", ") : "Unknown"}
                </Text>
              </View>
              {selectedExercises.includes(item.name) && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={24}
                  color="#5A3BFF"
                />
              )}
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.exerciseId}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 0,
          }}
          style={{ flex: 1 }}
          ListFooterComponent={
            selectedExercises.length > 0 ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddExercises}
              >
                <Text style={styles.addButtonText}>
                  Add {selectedExercises.length} Exercise(s)
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
};

// ---------------------------- STYLES ----------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#262135",
  },
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  backButton: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  time: {
    fontSize: 16,
    color: "#8E8E9E",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    // marginBottom: 20,
    color: "white",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E2D",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: "white",
    height: 50,
    fontSize: 16,
  },
  filterRow: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  filterButton: {
    backgroundColor: "#1E1E2D",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  filterButtonText: {
    color: "#5A3BFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
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
  exerciseImage: {
    width: "100%",
    height: "100%",
  },
  exerciseText: {
    fontSize: 16,
    color: "white",
  },
  categoryText: {
    fontSize: 12,
    color: "#8E8E9E",
    marginTop: 4,
  },
  selectedExercise: {
    backgroundColor: "#2A2A3A",
  },
  addButton: {
    backgroundColor: "#5A3BFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default SelectExercise;
