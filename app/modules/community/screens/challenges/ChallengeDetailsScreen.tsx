import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Modal,
  RefreshControl,
  Vibration,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChallengesStackParamList } from "../../navigation/CommunityNavigator";
import { db, auth } from "../../../../../firebaseConfig";
import {
  doc,
  updateDoc,
  arrayUnion,
  increment,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import LoadingIndicator from "../../../../components/LoadingIndicator";
import Slider from "@react-native-community/slider";

type Props = NativeStackScreenProps<
  ChallengesStackParamList,
  "ChallengeDetails"
>;

interface Participant {
  id: string;
  name: string;
  progress: number;
  joinedAt: any;
  lastUpdated?: any;
}

const DEFAULT_WORKOUT_IMG = require("../../../../assets/default_workout_pic.jpg");
const DEFAULT_ACTIVITY_IMG = require("../../../../assets/default_activity_pic.jpg");

const Tag = ({ text }: { text: string }) => (
  <View style={styles.tag}>
    <Text style={styles.tagText}>{text}</Text>
  </View>
);

const ProgressModal = ({
  visible,
  onClose,
  onUpdate,
  loading,
  initialProgress = 0,
  maxAllowed,
}: {
  visible: boolean;
  onClose: () => void;
  onUpdate: (progress: number) => void;
  loading: boolean;
  initialProgress?: number;
  maxAllowed: number;
}) => {
  const [localProgress, setLocalProgress] = useState(initialProgress);

  useEffect(() => {
    if (visible) {
      setLocalProgress(initialProgress);
    }
  }, [visible, initialProgress]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Update Progress</Text>

          <View style={styles.progressInputContainer}>
            <Text style={styles.progressLabel}>
              Current: {localProgress.toFixed(1)}%
            </Text>

            {/* Display the Max Allowed Limit to the User */}
            <Text
              style={{
                color: "#aaa",
                fontSize: 12,
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              Max allowed based on duration: {maxAllowed.toFixed(1)}%
            </Text>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={localProgress}
              onValueChange={(val) => {
                // --- INTEGRITY CHECK UI ---
                if (val > maxAllowed) {
                  // Snap back to max allowed
                  setLocalProgress(maxAllowed);
                  // Provide haptic feedback so know why it stopped
                  Vibration.vibrate();
                } else {
                  setLocalProgress(val);
                }
              }}
              minimumTrackTintColor="#4a90e2"
              maximumTrackTintColor="#444"
              // Turn the thumb red if they are hitting the limit
              thumbTintColor={
                localProgress >= maxAllowed ? "#e74c3c" : "#4a90e2"
              }
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.updateButton]}
              onPress={() => onUpdate(localProgress)}
              disabled={loading}
            >
              <Text style={styles.modalButtonText}>
                {loading ? "Updating..." : "Update"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const WorkoutSessionModal = ({
  visible,
  onClose,
  onComplete,
  sets,
  reps,
  restSeconds,
  gifUrl,
}: {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  sets: number;
  reps: number;
  restSeconds: number;
  gifUrl?: string;
}) => {
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(restSeconds);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentSet(1);
      setIsResting(false);
      setTimeLeft(restSeconds);
    }
  }, [visible, restSeconds]);

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isResting && timeLeft === 0) {
      // Rest finished
      Vibration.vibrate(); // Vibrate to notify user
      handleNextStep();
    }
    return () => clearInterval(interval);
  }, [isResting, timeLeft]);

  const handleNextStep = () => {
    if (isResting) {
      // Finished resting, start next set
      setIsResting(false);
      setTimeLeft(restSeconds);
      setCurrentSet((prev) => prev + 1);
    } else {
      // Finished a set
      if (currentSet >= sets) {
        // Workout Complete!
        onComplete();
      } else {
        // Start Rest
        setIsResting(true);
      }
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setTimeLeft(restSeconds);
    setCurrentSet((prev) => prev + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.sessionOverlay}>
        <View style={styles.sessionContent}>
          <TouchableOpacity style={styles.closeSession} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {gifUrl ? (
            <Image source={{ uri: gifUrl }} style={styles.sessionGif} />
          ) : null}

          <Text style={styles.sessionTitle}>
            {isResting ? "Rest Time" : `Set ${currentSet} of ${sets}`}
          </Text>

          {isResting ? (
            <View style={styles.timerContainer}>
              <MaterialCommunityIcons
                name="timer-sand"
                size={60}
                color="#f1c40f"
              />
              <Text style={styles.timerText}>
                {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, "0")}
              </Text>
              <Text style={styles.subText}>Catch your breath!</Text>
            </View>
          ) : (
            <View style={styles.activeContainer}>
              <MaterialCommunityIcons
                name="dumbbell"
                size={60}
                color="#4a90e2"
              />
              <Text style={styles.repText}>{reps}</Text>
              <Text style={styles.subText}>REPS</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.sessionButton,
              { backgroundColor: isResting ? "#444" : "#2ecc71" },
            ]}
            onPress={isResting ? skipRest : handleNextStep}
          >
            <Text style={styles.sessionButtonText}>
              {isResting
                ? "Skip Rest"
                : currentSet === sets
                  ? "Finish Workout"
                  : "Complete Set"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- MAIN SCREEN ---
const ChallengeDetailsScreen = ({ route, navigation }: Props) => {
  const { challenge } = route.params;
  const [isParticipant, setIsParticipant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatorName, setCreatorName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);

  const [exerciseDetails, setExerciseDetails] = useState<any>(null);

  // Modals state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  const [userProgress, setUserProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(challenge);

  // --- DATA INTEGRITY STATES ---
  const [maxAllowedProgress, setMaxAllowedProgress] = useState(100);
  const [participantJoinDate, setParticipantJoinDate] = useState<Date | null>(
    null
  );
  const [lastUpdatedDateString, setLastUpdatedDateString] = useState<
    string | null
  >(null);

  const [isImageLoading, setIsImageLoading] = useState(
    !!currentChallenge.imageUrl
  );

  const onRefresh = async () => {
    setRefreshing(true);
    const challengeDoc = await getDoc(doc(db, "challenges", challenge.id));
    let latestChallenge = challenge;
    if (challengeDoc.exists()) {
      latestChallenge = { id: challengeDoc.id, ...challengeDoc.data() };
      setCurrentChallenge(latestChallenge);
    }
    await Promise.all([
      fetchCreatorName(latestChallenge),
      fetchParticipants(latestChallenge),
      fetchExerciseDetails(latestChallenge),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    checkIfParticipant();
    fetchCreatorName(currentChallenge);
    fetchParticipants(currentChallenge);
    fetchExerciseDetails(currentChallenge);
  }, [currentChallenge]);

  // --- INTEGRITY LOGIC: CALCULATE MAX ALLOWED PROGRESS ---
  useEffect(() => {
    // If challenge is 1 day or less, no restriction needed (or user allows instant finish)
    if (currentChallenge.duration <= 1) {
      setMaxAllowedProgress(100);
      return;
    }

    if (participantJoinDate) {
      const now = new Date();
      // Calculate difference in days (start counting from join day as Day 1)
      const diffTime = Math.abs(now.getTime() - participantJoinDate.getTime());
      // ceil to ensure if they join today, it's day 1
      const daysPassed = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

      // Formula: (Days Active / Total Duration) * 100
      let limit = (daysPassed / currentChallenge.duration) * 100;

      // Allow a small buffer (e.g., if user is on Day 2 but technically 23.9 hours passed)
      // or simply cap at 100 and min 0
      if (limit > 100) limit = 100;
      if (limit < 0) limit = 0;

      setMaxAllowedProgress(limit);
    }
  }, [participantJoinDate, currentChallenge]);

  const fetchExerciseDetails = async (challengeObj = currentChallenge) => {
    if (challengeObj.type === "workout" && challengeObj.workoutId) {
      try {
        const exDoc = await getDoc(
          doc(db, "exercises", challengeObj.workoutId)
        );
        if (exDoc.exists()) {
          setExerciseDetails(exDoc.data());
        }
      } catch (error) {
        console.error("Error fetching exercise details:", error);
      }
    } else {
      setExerciseDetails(null);
    }
  };

  // Find and set the current user's progress when participants change
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const found = participants.find((p) => p.id === currentUser.uid);
      setUserProgress(found ? found.progress : 0);
    }
  }, [participants]);

  const checkIfParticipant = () => {
    const currentUser = auth.currentUser;
    if (currentUser && currentChallenge.participants) {
      setIsParticipant(currentChallenge.participants.includes(currentUser.uid));
    }
  };

  const fetchCreatorName = async (challengeObj = challenge) => {
    try {
      const userDoc = await getDoc(doc(db, "users", challengeObj.createdBy));
      if (userDoc.exists()) {
        setCreatorName(userDoc.data().name);
      }
    } catch (error) {
      console.error("Error fetching creator name:", error);
    }
  };

  const fetchParticipants = async (challengeObj = challenge) => {
    try {
      setLoadingParticipants(true);
      const currentUser = auth.currentUser;
      const participantsData: Participant[] = [];

      for (const participantId of challengeObj.participants || []) {
        const userDoc = await getDoc(doc(db, "users", participantId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const progressDoc = await getDoc(
            doc(
              db,
              "challenges",
              challengeObj.id,
              "participants",
              participantId
            )
          );

          let joinedAtVal = null;
          let progressVal = 0;
          let lastUpdatedVal = null;

          if (progressDoc.exists()) {
            const d = progressDoc.data();
            progressVal = d.progress || 0;
            joinedAtVal = d.joinedAt;
            lastUpdatedVal = d.lastUpdated;
          } else {
            joinedAtVal = serverTimestamp();
          }

          // --- CAPTURE CURRENT USER JOIN DATE FOR INTEGRITY CHECK ---
          if (currentUser && participantId === currentUser.uid) {
            if (joinedAtVal && joinedAtVal.toDate) {
              setParticipantJoinDate(joinedAtVal.toDate());
            } else if (joinedAtVal) {
              // If it's a JS Date or newly created timestamp
              setParticipantJoinDate(new Date(joinedAtVal));
            } else {
              // Fallback if not yet written
              setParticipantJoinDate(new Date());
            }

            //Set the state for the current user's last updated date
            if (lastUpdatedVal && lastUpdatedVal.toDate) {
              setLastUpdatedDateString(
                lastUpdatedVal.toDate().toLocaleDateString()
              );
            } else {
              setLastUpdatedDateString(null);
            }
          }

          participantsData.push({
            id: participantId,
            name: userData.name,
            progress: progressVal,
            joinedAt: joinedAtVal,
            lastUpdated: lastUpdatedVal,
          });
        }
      }
      participantsData.sort((a, b) => b.progress - a.progress);
      setParticipants(participantsData);
    } catch (error) {
      console.error("Error fetching participants:", error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const calculateDaysLeft = () => {
    if (!currentChallenge.createdAt) return 0;
    const startDate = currentChallenge.createdAt.toDate();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + currentChallenge.duration);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleJoinChallenge = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to join a challenge");
      return;
    }

    if (isParticipant) {
      Alert.alert(
        "Already Joined",
        "You are already participating in this challenge"
      );
      return;
    }

    setLoading(true);
    try {
      const challengeRef = doc(db, "challenges", challenge.id);
      const participantRef = doc(
        db,
        "challenges",
        challenge.id,
        "participants",
        currentUser.uid
      );

      // Create participant document first
      await setDoc(participantRef, {
        progress: 0,
        joinedAt: serverTimestamp(),
      });

      // Then update the challenge document
      await updateDoc(challengeRef, {
        participants: arrayUnion(currentUser.uid),
        participantCount: increment(1),
      });

      setIsParticipant(true);
      // Immediately set join date to now so local checks work instantly
      setParticipantJoinDate(new Date());

      const updatedChallengeDoc = await getDoc(challengeRef);
      if (updatedChallengeDoc.exists()) {
        const updatedChallenge = {
          id: updatedChallengeDoc.id,
          ...updatedChallengeDoc.data(),
        };
        setCurrentChallenge(updatedChallenge);
        // Now fetch participants with the updated challenge data
        await fetchParticipants(updatedChallenge);
      }
      Alert.alert("Success", "You have joined the challenge!");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionComplete = async () => {
    setShowSessionModal(false);

    // Safety check: if somehow they opened the modal but already finished today
    const today = new Date().toLocaleDateString();
    if (lastUpdatedDateString === today) {
      Alert.alert("Goal Met", "You have already completed the goal for today.");
      return;
    }

    setLoading(true);

    try {
      // Calculate new progress
      // Progress increment = 100% / Total Days Duration
      const dailyIncrement = 100 / (currentChallenge.duration || 1);
      let newProgress = userProgress + dailyIncrement;

      // Cap at 100%
      if (newProgress > 100) newProgress = 100;

      // Round to 1 decimal for cleanliness
      newProgress = Math.round(newProgress * 10) / 10;

      await handleUpdateProgress(newProgress);

      Alert.alert(
        "Great Job!",
        "You completed today's goal. Progress updated!"
      );
    } catch (error) {
      console.error("Session complete error", error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (challenge: any): string => {
    const text = (
      challenge.title +
      " " +
      (challenge.description || "")
    ).toLowerCase();

    if (challenge.duration >= 30) return "trophy";
    if (
      text.includes("run") ||
      text.includes("jog") ||
      text.includes("marathon")
    )
      return "run";
    if (
      text.includes("yoga") ||
      text.includes("meditate") ||
      text.includes("stretch")
    )
      return "yoga";
    if (
      text.includes("muscle") ||
      text.includes("strength") ||
      text.includes("lift") ||
      text.includes("gym")
    )
      return "dumbbell";
    if (text.includes("cycle") || text.includes("bike")) return "bike";
    if (text.includes("walk") || text.includes("step")) return "shoe-print";

    return "medal";
  };

  const checkAndAwardBadge = async (userId: string) => {
    try {
      const achievementsRef = collection(db, "users", userId, "achievements");

      // Check if user already has a badge for this challenge
      const q = query(
        achievementsRef,
        where("challengeId", "==", challenge.id)
      );
      const existingDocs = await getDocs(q);

      if (existingDocs.empty) {
        const badgeIcon = getBadgeIcon(challenge);

        // Create the badge
        await addDoc(achievementsRef, {
          title: `Completed: ${challenge.title}`,
          description: `Successfully completed the ${challenge.duration}-day ${challenge.title} challenge.`,
          challengeId: challenge.id,
          earnedAt: serverTimestamp(),
          icon: badgeIcon,
          type: "challenge_completion",
        });

        Alert.alert(
          "🎉 Challenge Complete!",
          "Congratulations! You have earned a new badge. Check it out in your Achievements."
        );
      }
    } catch (error) {
      console.error("Error awarding badge:", error);
    }
  };

  //  UPDATE HANDLER FOR INTEGRITY
  const handleUpdateProgress = async (progress: number) => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in to update progress");
        return;
      }

      // --- SERVER-SIDE/LOGIC INTEGRITY CHECK ---
      // Even if user bypassed UI, check math here before writing
      if (participantJoinDate && currentChallenge.duration > 1) {
        const now = new Date();
        const diffTime = Math.abs(
          now.getTime() - participantJoinDate.getTime()
        );
        const daysPassed = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        const calculatedLimit = (daysPassed / currentChallenge.duration) * 100;

        // Check if progress is significantly higher than allowed (allowing 1% buffer for rounding)
        if (progress > calculatedLimit + 1) {
          Alert.alert(
            "Action Blocked",
            "You cannot mark a multi-day challenge as complete ahead of time."
          );
          setShowProgressModal(false);
          setLoading(false);
          return;
        }
      }

      const statsRef = doc(
        db,
        "challenges",
        challenge.id,
        "participants",
        currentUser.uid
      );

      await updateDoc(statsRef, {
        progress: progress,
        lastUpdated: serverTimestamp(),
      });

      // Update the local state immediately so UI updates without refresh
      setLastUpdatedDateString(new Date().toLocaleDateString());

      if (progress >= 100) {
        await checkAndAwardBadge(currentUser.uid);
      }

      setShowProgressModal(false);
      fetchParticipants(currentChallenge);

      // Only show success alert if this wasn't called by handleSessionComplete (which has its own alert)
      if (!showSessionModal) {
        Alert.alert("Success", "Progress updated successfully!");
      }
    } catch (error: any) {
      console.error("Update error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const bodyParts: string[] = exerciseDetails
    ? (Array.isArray(exerciseDetails.bodyParts) && exerciseDetails.bodyParts) ||
      (exerciseDetails.bodyPart ? [exerciseDetails.bodyPart] : [])
    : [];

  const equipments: string[] = exerciseDetails
    ? (Array.isArray(exerciseDetails.equipments) &&
        exerciseDetails.equipments) ||
      (exerciseDetails.equipment ? [exerciseDetails.equipment] : [])
    : [];

  const steps: string[] =
    exerciseDetails && Array.isArray(exerciseDetails.instructions)
      ? exerciseDetails.instructions
      : [];

  const fallbackImage =
    currentChallenge.type === "workout"
      ? DEFAULT_WORKOUT_IMG
      : DEFAULT_ACTIVITY_IMG;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenge Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="rgba(255, 255, 255, 0.5)"
          />
        }
      >
        {/* Challenge Image */}
        <View style={styles.imageWrapper}>
          <Image
            source={
              currentChallenge.imageUrl
                ? { uri: currentChallenge.imageUrl }
                : fallbackImage
            }
            style={styles.image}
            // 3. Add Load Handlers
            onLoadStart={() => {
              if (currentChallenge.imageUrl) setIsImageLoading(true);
            }}
            onLoadEnd={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
          />

          {/* 4. The Loading Overlay */}
          {isImageLoading && (
            <View style={styles.imageLoadingOverlay}>
              <LoadingIndicator size="large" color="#fff" />
            </View>
          )}
        </View>
        {/* Challenge Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{currentChallenge.title}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={24}
                color="#4a90e2"
              />
              <Text style={styles.statText}>
                {calculateDaysLeft()} days to go
              </Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="account-group"
                size={24}
                color="#4a90e2"
              />
              <Text style={styles.statText}>
                {currentChallenge.participantCount || 0} participants
              </Text>
            </View>
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              {currentChallenge.description || "No description provided."}
            </Text>
          </View>

          <View style={styles.detailsContainer}>
            <Text style={styles.sectionTitle}>Challenge Details</Text>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons
                name="calendar"
                size={20}
                color="#4a90e2"
              />
              <Text style={styles.detailText}>
                Duration: {currentChallenge.duration} days
              </Text>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="trophy" size={20} color="#4a90e2" />
              <Text style={styles.detailText}>
                Created by: {creatorName || "Loading..."}
              </Text>
            </View>
          </View>

          {/* WORKOUT INFO CARD (Sets/Reps) */}
          {currentChallenge.type === "workout" && (
            <>
              <View style={styles.workoutInfoContainer}>
                <Text style={styles.sectionTitle}>Daily Workout Goal</Text>
                <View style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <MaterialCommunityIcons
                      name="dumbbell"
                      size={24}
                      color="#fff"
                    />
                    <Text style={styles.workoutName}>
                      {currentChallenge.workoutName}
                    </Text>
                  </View>
                  <View style={styles.workoutStatsRow}>
                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatValue}>
                        {currentChallenge.customSets}
                      </Text>
                      <Text style={styles.workoutStatLabel}>Sets</Text>
                    </View>
                    <View style={styles.workoutStatDivider} />
                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatValue}>
                        {currentChallenge.customReps}
                      </Text>
                      <Text style={styles.workoutStatLabel}>Reps</Text>
                    </View>
                    <View style={styles.workoutStatDivider} />
                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatValue}>
                        {currentChallenge.customRestSeconds}s
                      </Text>
                      <Text style={styles.workoutStatLabel}>Rest</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* EXERCISE INSTRUCTIONS & DETAILS (New Section) */}
              {exerciseDetails && (
                <View style={styles.exerciseDetailsContainer}>
                  <View style={styles.sectionDivider} />
                  <Text style={styles.sectionTitle}>Exercise Guide</Text>

                  {!!exerciseDetails.gifUrl && (
                    <Image
                      source={{ uri: exerciseDetails.gifUrl }}
                      style={styles.gif}
                      resizeMode="cover"
                    />
                  )}

                  {bodyParts.length > 0 && (
                    <>
                      <Text style={styles.subLabel}>Body Part(s)</Text>
                      <View style={styles.tagsContainer}>
                        {bodyParts.map((part) => (
                          <Tag key={part} text={part} />
                        ))}
                      </View>
                    </>
                  )}

                  {equipments.length > 0 && (
                    <>
                      <Text style={styles.subLabel}>Equipment</Text>
                      <View style={styles.tagsContainer}>
                        {equipments.map((eq) => (
                          <Tag key={eq} text={eq} />
                        ))}
                      </View>
                    </>
                  )}

                  {steps.length > 0 && (
                    <>
                      <Text style={styles.subLabel}>Instructions</Text>
                      <View style={{ marginTop: 6, marginBottom: 10 }}>
                        {steps.map((s, i) => (
                          <Text key={i} style={styles.step}>
                            {s}
                          </Text>
                        ))}
                      </View>
                    </>
                  )}
                  <View style={styles.sectionDivider} />
                </View>
              )}
            </>
          )}
          {/* Participants Section */}
          <View style={styles.participantsContainer}>
            <Text style={styles.sectionTitle}>Participants</Text>

            {loadingParticipants ? (
              <LoadingIndicator
                color="rgba(255, 255, 255, 0.5)"
                style={styles.loader}
              />
            ) : (
              <>
                {participants.map((participant, index) => (
                  <View key={participant.id} style={styles.participantCard}>
                    <View style={styles.participantHeader}>
                      <View style={styles.rankContainer}>
                        <Text style={styles.rankText}>#{index + 1}</Text>
                      </View>
                      <View style={styles.participantInfo}>
                        <Text style={styles.participantName}>
                          {participant.name}
                        </Text>
                        <Text style={styles.joinDate}>
                          Joined:{" "}
                          {participant.joinedAt && participant.joinedAt.toDate
                            ? participant.joinedAt.toDate().toLocaleDateString()
                            : "Unknown"}
                        </Text>
                      </View>
                      <View style={styles.progressContainer}>
                        <Text style={styles.progressText}>
                          {participant.progress}%
                        </Text>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${participant.progress}%` },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                {participants.length === 0 && (
                  <Text style={styles.noParticipants}>
                    No participants yet. Be the first to join!
                  </Text>
                )}
              </>
            )}
          </View>

          {/* BUTTON LOGIC */}
          <View style={styles.buttonContainer}>
            {isParticipant ? (
              userProgress >= 100 ? (
                <View
                  style={[
                    styles.updateProgressButton,
                    { backgroundColor: "#4CAF50", opacity: 0.8 },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.updateProgressButtonText}>
                    Challenge Completed
                  </Text>
                </View>
              ) : // Check if last updated date is today
              lastUpdatedDateString === new Date().toLocaleDateString() ? (
                <View
                  style={[
                    styles.updateProgressButton,
                    { backgroundColor: "#555", opacity: 0.8 }, // Grey/Disabled look
                  ]}
                >
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.updateProgressButtonText}>
                    Goal Completed Today
                  </Text>
                </View>
              ) : currentChallenge.type === "workout" ? (
                // Workout Type: Start Goal Button
                <TouchableOpacity
                  style={styles.updateProgressButton}
                  onPress={() => setShowSessionModal(true)}
                >
                  <MaterialCommunityIcons
                    name="play-circle"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.updateProgressButtonText}>
                    Start Today's Goal
                  </Text>
                </TouchableOpacity>
              ) : (
                // Activity Type: Manual Update Button
                <TouchableOpacity
                  style={styles.updateProgressButton}
                  onPress={() => setShowProgressModal(true)}
                >
                  <MaterialCommunityIcons
                    name="chart-line"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.updateProgressButtonText}>
                    Update Progress
                  </Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity
                style={[styles.joinButton, loading && styles.disabledButton]}
                onPress={handleJoinChallenge}
                disabled={loading}
              >
                <Text style={styles.joinButtonText}>
                  {loading ? "Joining..." : "Join Challenge"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ProgressModal
            visible={showProgressModal}
            onClose={() => setShowProgressModal(false)}
            onUpdate={handleUpdateProgress}
            loading={loading}
            initialProgress={userProgress}
            maxAllowed={maxAllowedProgress}
          />

          <WorkoutSessionModal
            visible={showSessionModal}
            onClose={() => setShowSessionModal(false)}
            onComplete={handleSessionComplete}
            sets={currentChallenge.customSets || 3}
            reps={currentChallenge.customReps || 10}
            restSeconds={currentChallenge.customRestSeconds || 60}
            gifUrl={exerciseDetails?.gifUrl}
          />
        </View>
      </ScrollView>
    </View>
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
  scrollView: {
    flex: 1,
  },
  image: {
    width: "100%",
    height: 200,
  },
  imageWrapper: {
    position: "relative", // Needed for absolute positioning of loader
  },
  imageLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)", // Semi-transparent dimming
    zIndex: 1,
  },
  infoContainer: {
    padding: 16,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: 24,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  statText: {
    color: "#aaa",
    fontSize: 12,
    marginLeft: 8,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  description: {
    color: "#aaa",
    lineHeight: 24,
  },
  detailsContainer: {
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    color: "#fff",
    marginLeft: 8,
  },
  joinButton: {
    backgroundColor: "#4a90e2",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  joinedButton: {
    backgroundColor: "#2ecc71",
  },
  disabledButton: {
    opacity: 0.7,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  workoutInfoContainer: {
    marginBottom: 24,
  },
  workoutCard: {
    backgroundColor: "#4a90e2",
    borderRadius: 12,
    padding: 16,
  },
  workoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  workoutName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  workoutStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 8,
    padding: 12,
  },
  workoutStat: {
    alignItems: "center",
    flex: 1,
  },
  workoutStatValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  workoutStatLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  workoutStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  exerciseDetailsContainer: { marginTop: 10 },
  sectionDivider: {
    height: 1,
    backgroundColor: "#444",
    marginVertical: 20,
  },
  subLabel: {
    color: "#ddd",
    marginTop: 16,
    fontWeight: "600",
    fontSize: 16,
  },
  gif: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#444",
    marginTop: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  tag: {
    backgroundColor: "#4a90e2",
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  tagText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  step: {
    color: "#ddd",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  participantsContainer: {
    padding: 16,
    marginBottom: 16,
  },
  loader: {
    marginVertical: 20,
  },
  participantCard: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  participantHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  rankContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#4a90e2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText: {
    color: "#fff",
    fontWeight: "bold",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  lastActive: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    width: 100,
    alignItems: "flex-end",
  },
  progressText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#444",
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4a90e2",
    borderRadius: 2,
  },
  noParticipants: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 20,
  },
  buttonContainer: {
    padding: 16,
  },
  updateProgressButton: {
    backgroundColor: "#2ecc71",
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  updateProgressButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  // Session Modal Styles
  sessionOverlay: {
    flex: 1,
    backgroundColor: "#262135",
    justifyContent: "center",
    padding: 20,
  },
  sessionContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  closeSession: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 10,
  },
  sessionGif: {
    width: "100%",
    height: 250,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#444",
  },
  sessionTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
  },
  timerContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  timerText: {
    fontSize: 60,
    fontWeight: "bold",
    color: "#f1c40f",
    marginVertical: 20,
  },
  activeContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  repText: {
    fontSize: 80,
    fontWeight: "bold",
    color: "#fff",
  },
  subText: {
    fontSize: 18,
    color: "#aaa",
    marginTop: 8,
  },
  sessionButton: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: "80%",
    alignItems: "center",
  },
  sessionButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#262135",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  progressInputContainer: {
    marginBottom: 20,
  },
  progressLabel: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: "#666",
  },
  updateButton: {
    backgroundColor: "#4a90e2",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  joinDate: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
});

export default ChallengeDetailsScreen;
