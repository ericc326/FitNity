import React, { useState, useEffect, useRef } from "react";
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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChallengesStackParamList } from "../../navigation/CommunityNavigator";
import { db, storage } from "../../../../../firebaseConfig";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import LoadingIndicator from "../../../../components/LoadingIndicator";

type Props = NativeStackScreenProps<ChallengesStackParamList, "EditChallenge">;

const EditChallengeScreen = ({ route, navigation }: Props) => {
  const passedChallenge = route.params?.challenge;
  const challengeRef = useRef(passedChallenge);

  if (passedChallenge) {
    challengeRef.current = passedChallenge;
  }

  const challenge = challengeRef.current;

  const [title, setTitle] = useState(challenge.title);
  const [description, setDescription] = useState(challenge.description);
  const [duration, setDuration] = useState(challenge.duration.toString());
  const [selectedImage, setSelectedImage] = useState(
    challenge.imageUrl || null
  );
  const [imageLoading, setImageLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Workout Fields (only used if challenge.type === 'workout')
  const isWorkoutType = challenge.type === "workout";
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(
    challenge.workoutName || null
  );
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
    challenge.workoutId || null
  );

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customSets, setCustomSets] = useState<number | null>(
    challenge.customSets || null
  );
  const [customReps, setCustomReps] = useState<number | null>(
    challenge.customReps || null
  );
  const [customRestSec, setCustomRestSec] = useState<number | null>(
    challenge.customRestSeconds || null
  );
  const [customLabel, setCustomLabel] = useState<string | null>(
    challenge.customLabel || null
  );

  useEffect(() => {
    const params = route.params as any;
    if (params?.selectedExercise) {
      setSelectedWorkout(params.selectedExercise);
      setSelectedWorkoutId(params.selectedExerciseId);
    }
  }, [route.params]);

  const uploadImage = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = uri.substring(uri.lastIndexOf("/") + 1);
    const storageReference = storageRef(
      storage,
      `challenges/${Date.now()}_${filename}`
    );
    await uploadBytes(storageReference, blob);
    return await getDownloadURL(storageReference);
  };

  const handleImage = async (fromCamera: boolean) => {
    let status;
    if (fromCamera) {
      status = (await ImagePicker.requestCameraPermissionsAsync()).status;
    } else {
      status = (await ImagePicker.requestMediaLibraryPermissionsAsync()).status;
    }
    if (status !== "granted") {
      alert(
        `Sorry, we need ${fromCamera ? "camera" : "media library"} permissions!`
      );
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: "images",
          allowsEditing: true,
          aspect: [16, 9],
          quality: 1,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          allowsEditing: true,
          aspect: [16, 9],
          quality: 1,
        });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeImage = () => setSelectedImage(null);

  const handleUpdateChallenge = async () => {
    if (!title || !description || !duration) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (isWorkoutType && (!selectedWorkoutId || !customSets || !customReps)) {
      Alert.alert("Error", "Please complete all workout details");
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl = challenge.imageUrl; // default to old image

      // If selectedImage is a new local file (not the old URL), upload it
      if (
        selectedImage &&
        selectedImage !== challenge.imageUrl &&
        !selectedImage.startsWith("http")
      ) {
        // Delete old image if it exists
        if (challenge.imageUrl && challenge.imageUrl.includes("/o/")) {
          try {
            const pathWithParams = challenge.imageUrl.split("/o/")[1];
            const oldImagePath = decodeURIComponent(
              pathWithParams.split("?")[0]
            );
            const oldImageRef = storageRef(storage, oldImagePath);
            await deleteObject(oldImageRef);
          } catch (err) {
            console.warn("Failed to delete old image:", err);
          }
        }

        imageUrl = await uploadImage(selectedImage);
      }

      // If image was removed
      if (!selectedImage && challenge.imageUrl) {
        // Delete old image if it exists
        if (challenge.imageUrl.includes("/o/")) {
          try {
            const pathWithParams = challenge.imageUrl.split("/o/")[1];
            const oldImagePath = decodeURIComponent(
              pathWithParams.split("?")[0]
            );
            const oldImageRef = storageRef(storage, oldImagePath);
            await deleteObject(oldImageRef);
          } catch (err) {
            console.warn("Failed to delete old image:", err);
          }
        }
        imageUrl = null;
      }

      // Update the challenge document
      const updateData: any = {
        title,
        description,
        duration: parseInt(duration),
        imageUrl,
        updatedAt: serverTimestamp(),
      };

      if (isWorkoutType) {
        updateData.workoutName = selectedWorkout;
        updateData.workoutId = selectedWorkoutId;
        updateData.customSets = customSets;
        updateData.customReps = customReps;
        updateData.customRestSeconds = customRestSec;
        updateData.customLabel = customLabel;
      }

      await updateDoc(doc(db, "challenges", challenge.id), updateData);

      Alert.alert("Success", "Challenge updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to update challenge. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isChanged =
    // 1. General Fields
    title.trim() !== challenge.title.trim() ||
    description.trim() !== challenge.description.trim() ||
    duration.trim() !== challenge.duration.toString().trim() ||
    selectedImage !== (challenge.imageUrl || null) ||
    // 2. Workout Fields (Combined with OR '||')
    (isWorkoutType &&
      (selectedWorkoutId !== challenge.workoutId ||
        customSets !== challenge.customSets ||
        customReps !== challenge.customReps ||
        customRestSec !== challenge.customRestSeconds));

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      enableOnAndroid
      keyboardShouldPersistTaps="handled"
      extraScrollHeight={100}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Challenge</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="Challenge Title"
          placeholderTextColor="#666"
          value={title}
          onChangeText={setTitle}
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Challenge Description"
          placeholderTextColor="#666"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.label}>Duration</Text>
        <TextInput
          style={styles.input}
          placeholder="Duration (in days)"
          placeholderTextColor="#666"
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
        />
        {/* Image Handling */}
        {selectedImage && (
          <View style={{ position: "relative" }}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.imagePreview}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />
            {imageLoading && (
              <LoadingIndicator size="large" color="rgba(255, 255, 255, 0.5)" />
            )}
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={removeImage}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={styles.photoButton}
          onPress={() => handleImage(false)}
        >
          <MaterialCommunityIcons name="image-edit" size={28} color="#6c5ce7" />
          <Text style={styles.photoButtonText}>Change Photo (Album)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.photoButton}
          onPress={() => handleImage(true)}
        >
          <MaterialCommunityIcons name="camera" size={28} color="#6c5ce7" />
          <Text style={styles.photoButtonText}>Change Photo (Camera)</Text>
        </TouchableOpacity>

        {/* WORKOUT FIELDS (Only show if type was workout) */}
        {isWorkoutType && (
          <View style={styles.workoutSection}>
            <Text style={styles.sectionHeader}>Workout Details</Text>
            <TouchableOpacity
              style={styles.workoutDetailButton}
              onPress={() => {
                navigation.getParent()?.navigate("Workout", {
                  screen: "SelectExercise",
                  params: {
                    returnToEditChallenge: true,
                    challengeId: challenge.id,
                  },
                });
              }}
            >
              <MaterialCommunityIcons
                name="dumbbell"
                size={20}
                color="#bdbdbd"
              />
              <Text style={styles.workoutDetailButtonText}>
                {selectedWorkout}
              </Text>
              <MaterialCommunityIcons name="pencil" size={20} color="#bdbdbd" />
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
                {customLabel || "Set Reps & Rest"}
              </Text>
              <MaterialCommunityIcons name="pencil" size={20} color="#bdbdbd" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.updateButton,
            (!isChanged || isSaving) && styles.updateButtonDisabled,
          ]}
          onPress={handleUpdateChallenge}
          disabled={!isChanged || isSaving}
        >
          {isSaving ? (
            <LoadingIndicator size="small" color="#fff" />
          ) : (
            <Text
              style={[
                styles.updateButtonText,
                (!isChanged || isSaving) && styles.updateButtonTextDisabled,
              ]}
            >
              {!isChanged ? "No Changes" : "Update Challenge"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={showCustomModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Workout Goals</Text>

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
                <Text style={styles.modalButtonText}>Save</Text>
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
  content: {
    padding: 16,
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
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 20,
    padding: 6,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(108, 92, 231, 0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  photoButtonText: {
    color: "#6c5ce7",
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
  updateButton: {
    backgroundColor: "#4a90e2",
    padding: 16,
    borderRadius: 20,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  updateButtonDisabled: {
    backgroundColor: "#3d3654",
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  updateButtonTextDisabled: {
    color: "#aaa",
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
  modalRow: {
    marginBottom: 12,
  },
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
});

export default EditChallengeScreen;
