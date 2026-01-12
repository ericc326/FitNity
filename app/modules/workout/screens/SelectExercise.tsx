import React, { useState, useEffect } from "react";
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
  Modal,
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
  const returnToCreateSchedule = !!route?.params?.returnToCreateSchedule;
  const returnToEditSchedule = !!route?.params?.returnToEditSchedule;
  const returnToCreateChallenge = !!route?.params?.returnToCreateChallenge;
  const returnToEditChallenge = !!route?.params?.returnToEditChallenge;
  const scheduleId: string | undefined = route?.params?.scheduleId;
  const challengeId: string | undefined = route?.params?.challengeId;
  const fromHome = !!route?.params?.fromHome;

  const [searchText, setSearchText] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null); //name of selected exercise
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null
  ); // id of selected exercise
  const [exerciseData, setExerciseData] = useState<any[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<any[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [bodyPartsList, setBodyPartsList] = useState<string[]>([]);
  const [equipmentList, setEquipmentList] = useState<string[]>([]);

  const [selectedBodyPart, setSelectedBodyPart] = useState("All");
  const [selectedEquipment, setSelectedEquipment] = useState("All");

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

            const uniqueBodyParts = new Set<string>(["All"]);
            const equip = new Set<string>(["All"]);
            data.forEach((item: any) => {
              if (Array.isArray(item.bodyParts))
                item.bodyParts.forEach((bp: string) => uniqueBodyParts.add(bp));
              if (Array.isArray(item.equipments))
                item.equipments.forEach((eq: string) => equip.add(eq));
              // Support for single string fields if database format varies
              if (typeof item.bodyPart === "string")
                uniqueBodyParts.add(item.bodyPart);
              if (typeof item.equipment === "string") equip.add(item.equipment);
            });
            setBodyPartsList(Array.from(uniqueBodyParts));
            setEquipmentList(Array.from(equip));
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
  useEffect(() => {
    let filtered = exerciseData;

    // 1. Filter by Body Part
    if (selectedBodyPart && selectedBodyPart !== "All") {
      filtered = filtered.filter((ex: any) => {
        const parts = Array.isArray(ex.bodyParts)
          ? ex.bodyParts
          : [ex.bodyPart];
        return parts.some(
          (bp: string) => bp?.toLowerCase() === selectedBodyPart.toLowerCase()
        );
      });
    }

    // 2. Filter by Equipment
    if (selectedEquipment && selectedEquipment !== "All") {
      filtered = filtered.filter((ex: any) => {
        const equips = Array.isArray(ex.equipments)
          ? ex.equipments
          : [ex.equipment];
        return equips.some(
          (eq: string) => eq?.toLowerCase() === selectedEquipment.toLowerCase()
        );
      });
    }

    // 3. Filter by Search Text
    if (searchText.trim()) {
      filtered = filtered.filter((ex: any) =>
        ex.name?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredExercises(filtered);
  }, [searchText, selectedBodyPart, selectedEquipment, exerciseData]);

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
    // Handle Schedule Returns
    if (returnToCreateSchedule) {
      navigation.getParent()?.navigate("Schedule", {
        screen: "CreateSchedule",
        params: { selectedExercise, selectedExerciseId, fromHome },
      } as any);
    } else if (returnToEditSchedule && scheduleId) {
      navigation.getParent()?.navigate("Schedule", {
        screen: "EditSchedule",
        params: { scheduleId, selectedExercise, selectedExerciseId },
      } as any);
    }
    // Handle Challenge Returns
    else if (returnToCreateChallenge) {
      navigation.getParent()?.navigate("Community", {
        screen: "ChallengesTab",
        params: {
          screen: "CreateChallenge",
          params: { selectedExercise, selectedExerciseId },
        },
      } as any);
    } else if (returnToEditChallenge && challengeId) {
      navigation.getParent()?.navigate("Community", {
        screen: "ChallengesTab",
        params: {
          screen: "EditChallenge",
          params: { challengeId, selectedExercise, selectedExerciseId },
        },
      } as any);
    } else {
      navigation.goBack();
    }
  };

  const handleBack = () => {
    if (returnToCreateSchedule) {
      navigation.getParent()?.navigate("Schedule", {
        screen: "CreateSchedule",
        params: { fromHome },
      } as any);
    } else if (returnToEditSchedule && scheduleId) {
      navigation.getParent()?.navigate("Schedule", {
        screen: "EditSchedule",
        params: { scheduleId },
      } as any);
    } else if (returnToCreateChallenge) {
      navigation.getParent()?.navigate("Community", {
        screen: "ChallengesTab",
        params: {
          screen: "CreateChallenge",
        },
      } as any);
    } else if (returnToEditChallenge && challengeId) {
      navigation.getParent()?.navigate("Community", {
        screen: "ChallengesTab",
        params: {
          screen: "EditChallenge",
          params: { challengeId },
        },
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

          {/* SEARCH BAR WITH FILTER ICON */}
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons
                name="magnify"
                size={22}
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
          </View>

          {/* Status Indicator */}
          {(selectedBodyPart !== "All" || selectedEquipment !== "All") && (
            <Text style={styles.activeFiltersText}>
              Filters: {selectedBodyPart !== "All" ? selectedBodyPart : ""}
              {selectedBodyPart !== "All" && selectedEquipment !== "All"
                ? " + "
                : ""}
              {selectedEquipment !== "All" ? selectedEquipment : ""}
            </Text>
          )}
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
                    {item.bodyParts?.join(", ") || item.bodyPart} |{" "}
                    {item.equipments?.join(", ") ||
                      item.equipment ||
                      "No Equip"}
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
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No exercises found with these filters.
            </Text>
          }
        />

        {/* FILTER MODAL (THE DROPDOWN) */}
        <Modal
          visible={isFilterVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Refine Exercises</Text>
                <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.filterLabel}>Target Muscle Group</Text>
                <View style={styles.chipContainer}>
                  {bodyPartsList.map((part) => (
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
                  Equipment
                </Text>
                <View style={styles.chipContainer}>
                  {equipmentList.map((eq) => (
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
  headerBlock: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backButton: { paddingRight: 12, paddingVertical: 4 },
  title: { fontSize: 24, fontWeight: "bold", color: "white" },
  searchRow: { flexDirection: "row", alignItems: "center" },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E2D",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: "white", fontSize: 16 },
  filterIconButton: {
    marginLeft: 12,
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
  exerciseText: { fontSize: 16, color: "white", fontWeight: "600" },
  categoryText: { fontSize: 12, color: "#8E8E9E", marginTop: 4 },
  selectedExercise: {
    backgroundColor: "#2A2A3A",
    borderColor: "#5A3BFF",
    borderWidth: 1,
  },
  emptyText: {
    color: "#8E8E9E",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#262135",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  filterLabel: {
    color: "#8E8E9E",
    fontSize: 14,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  chipContainer: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    backgroundColor: "#1E1E2D",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  activeChip: { backgroundColor: "#5A3BFF", borderColor: "#5A3BFF" },
  chipText: { color: "#aaa", fontSize: 14 },
  activeChipText: { color: "white", fontWeight: "bold" },
  applyButton: {
    backgroundColor: "#5A3BFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  applyButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },

  fixedAddContainer: { position: "absolute", bottom: 20, left: 20, right: 20 },
  addButton: {
    backgroundColor: "#5A3BFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  addButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
});

export default SelectExercise;
