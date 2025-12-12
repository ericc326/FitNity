import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChallengesStackParamList } from "../../navigation/CommunityNavigator";
import { db, auth, storage } from "../../../../../firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
} from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

type NavigationProp = NativeStackNavigationProp<
  ChallengesStackParamList,
  "CreateChallenge"
>;

const CreateChallengeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute() as any;

  const [challengeType, setChallengeType] = useState<"activity" | "workout">(
    "activity"
  );

  // Activity Type Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Workout Type Fields
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
    null
  );

  // Custom Reps/Sets State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customSets, setCustomSets] = useState<number | null>(null);
  const [customReps, setCustomReps] = useState<number | null>(null);
  const [customRestSec, setCustomRestSec] = useState<number | null>(null);
  const [customLabel, setCustomLabel] = useState<string | null>(null);

  // Handle Return from SelectExercise
  useEffect(() => {
    if (route.params?.selectedExercise) {
      setSelectedWorkout(route.params.selectedExercise);
      setSelectedWorkoutId(route.params.selectedExerciseId);
      setChallengeType("workout");
    }
  }, [route.params]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleCreateChallenge = async () => {
    if (!title || !description || !duration) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (challengeType === "workout") {
      if (!selectedWorkoutId) {
        Alert.alert("Error", "Please select a workout for this challenge");
        return;
      }
      if (!customSets || !customReps) {
        Alert.alert("Error", "Please define Sets and Reps for the workout");
        return;
      }
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in to create a challenge");
        return;
      }

      let imageUrl = "";
      if (image) {
        const response = await fetch(image);
        const blob = await response.blob();
        const filename = image.substring(image.lastIndexOf("/") + 1);
        const imageRef = ref(storage, `challenges/${Date.now()}_${filename}`);
        await uploadBytes(imageRef, blob);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Construct Data
      const challengeData: any = {
        title,
        description,
        duration: parseInt(duration),
        imageUrl,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        participants: [currentUser.uid],
        participantCount: 1,
        type: challengeType,
      };

      if (challengeType === "workout") {
        challengeData.workoutName = selectedWorkout;
        challengeData.workoutId = selectedWorkoutId;
        challengeData.customSets = customSets;
        challengeData.customReps = customReps;
        challengeData.customRestSeconds = customRestSec;
        challengeData.customLabel = customLabel;
      }

      // Create the challenge document
      const challengeRef = await addDoc(
        collection(db, "challenges"),
        challengeData
      );

      // Create the participant document for the creator
      await setDoc(
        doc(db, "challenges", challengeRef.id, "participants", currentUser.uid),
        {
          progress: 0,
          joinedAt: serverTimestamp(),
        }
      );

      Alert.alert("Success", "Challenge created successfully!");
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Challenge</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        {/* TYPE TOGGLE */}
        <View style={styles.typeToggleContainer}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              challengeType === "activity" && styles.typeButtonActive,
            ]}
            onPress={() => setChallengeType("activity")}
          >
            <MaterialCommunityIcons
              name="run"
              size={20}
              color={challengeType === "activity" ? "#fff" : "#888"}
            />
            <Text
              style={[
                styles.typeText,
                challengeType === "activity" && styles.typeTextActive,
              ]}
            >
              Activity
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              challengeType === "workout" && styles.typeButtonActive,
            ]}
            onPress={() => setChallengeType("workout")}
          >
            <MaterialCommunityIcons
              name="dumbbell"
              size={20}
              color={challengeType === "workout" ? "#fff" : "#888"}
            />
            <Text
              style={[
                styles.typeText,
                challengeType === "workout" && styles.typeTextActive,
              ]}
            >
              Workout
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <MaterialCommunityIcons name="camera" size={32} color="#4a90e2" />
              <Text style={styles.placeholderText}>Add Challenge Image</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 30 Days Running"
          placeholderTextColor="#666"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the goal..."
          placeholderTextColor="#666"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Duration (Days)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 30"
          placeholderTextColor="#666"
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
        />

        {/* WORKOUT SPECIFIC FIELDS */}
        {challengeType === "workout" && (
          <View style={styles.workoutSection}>
            <Text style={styles.sectionHeader}>Workout Details</Text>

            <TouchableOpacity
              style={styles.workoutDetailButton}
              onPress={() => {
                navigation.getParent()?.navigate("Workout", {
                  screen: "SelectExercise",
                  params: { returnToCreateChallenge: true },
                });
              }}
            >
              <MaterialCommunityIcons
                name="dumbbell"
                size={20}
                color="#bdbdbd"
              />
              <Text style={styles.workoutDetailButtonText}>
                {selectedWorkout || "Choose Exercise"}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color="#bdbdbd"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.workoutDetailButton}
              onPress={() => setShowCustomModal(true)}
            >
              <MaterialCommunityIcons
                name="chart-bar"
                size={20}
                color="#bdbdbd"
              />
              <Text style={styles.workoutDetailButtonText}>
                {customLabel || "Set Reps & Sets"}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color="#bdbdbd"
              />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateChallenge}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? "Creating..." : "Create Challenge"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* REPS/SETS MODAL */}
      <Modal visible={showCustomModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Target Reps & Rest</Text>

            <View style={styles.modalRow}>
              <Text style={{ color: "#fff", marginBottom: 6 }}>Sets</Text>
              <TextInput
                style={styles.numberInput}
                value={customSets?.toString() ?? ""}
                onChangeText={(t) => setCustomSets(t ? Number(t) : null)}
                keyboardType="numeric"
                placeholder="e.g. 3"
                placeholderTextColor="#777"
              />
            </View>

            <View style={styles.modalRow}>
              <Text style={{ color: "#fff", marginBottom: 6 }}>Reps / Set</Text>
              <TextInput
                style={styles.numberInput}
                value={customReps?.toString() ?? ""}
                onChangeText={(t) => setCustomReps(t ? Number(t) : null)}
                keyboardType="numeric"
                placeholder="e.g. 10"
                placeholderTextColor="#777"
              />
            </View>

            <View style={styles.modalRow}>
              <Text style={{ color: "#fff", marginBottom: 6 }}>Rest (sec)</Text>
              <TextInput
                style={styles.numberInput}
                value={customRestSec?.toString() ?? ""}
                onChangeText={(t) => setCustomRestSec(t ? Number(t) : null)}
                keyboardType="numeric"
                placeholder="e.g. 60"
                placeholderTextColor="#777"
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#444" }]}
                onPress={() => setShowCustomModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#4a90e2" }]}
                onPress={() => {
                  const s = customSets ?? 0;
                  const r = customReps ?? 0;
                  const rs = customRestSec ?? 0;
                  setCustomLabel(`${s} Sets × ${r} Reps • ${rs}s Rest`);
                  setShowCustomModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    padding: 16,
  },
  typeToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#332c4a",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  typeButtonActive: {
    backgroundColor: "#4a90e2",
  },
  typeText: {
    color: "#888",
    marginLeft: 8,
    fontWeight: "600",
  },
  typeTextActive: {
    color: "#fff",
  },
  imageContainer: {
    width: "100%",
    height: 200,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#332c4a",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#fff",
    marginTop: 8,
  },
  label: {
    color: "#aaa",
    marginBottom: 6,
    fontSize: 14,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#332c4a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: "#fff",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  workoutSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionHeader: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  workoutDetailButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  workoutDetailButtonText: {
    color: "#fff",
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#2b2435",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  modalRow: { marginBottom: 12 },
  numberInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 10,
    color: "#fff",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  createButton: {
    backgroundColor: "#4a90e2",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CreateChallengeScreen;
