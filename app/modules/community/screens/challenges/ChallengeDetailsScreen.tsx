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
}

const ProgressModal = ({
  visible,
  onClose,
  onUpdate,
  loading,
  initialProgress = 0,
}: {
  visible: boolean;
  onClose: () => void;
  onUpdate: (progress: number) => void;
  loading: boolean;
  initialProgress?: number;
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
            <Text style={styles.progressLabel}>Progress: {localProgress}%</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={localProgress}
              onValueChange={setLocalProgress}
              minimumTrackTintColor="#4a90e2"
              maximumTrackTintColor="#444"
              thumbTintColor="#4a90e2"
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

const ChallengeDetailsScreen = ({ route, navigation }: Props) => {
  const { challenge } = route.params;
  const [isParticipant, setIsParticipant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatorName, setCreatorName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [userProgress, setUserProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(challenge);

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
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    checkIfParticipant();
    fetchCreatorName(currentChallenge);
    fetchParticipants(currentChallenge);
  }, [currentChallenge]);

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
          const progressData = progressDoc.exists()
            ? progressDoc.data()
            : { progress: 0, joinedAt: serverTimestamp() };
          participantsData.push({
            id: participantId,
            name: userData.name,
            progress: progressData.progress || 0,
            joinedAt: progressData.joinedAt,
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
      Alert.alert("Success", "You have joined the challenge!");
      fetchParticipants();
    } catch (error: any) {
      Alert.alert("Error", error.message);
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

    // Check Duration (Long term challenges get a Trophy)
    if (challenge.duration >= 30) {
      return "trophy";
    }

    // Check Activity Type keywords
    if (
      text.includes("run") ||
      text.includes("jog") ||
      text.includes("marathon")
    ) {
      return "run";
    }
    if (
      text.includes("yoga") ||
      text.includes("meditate") ||
      text.includes("stretch")
    ) {
      return "yoga";
    }
    if (
      text.includes("muscle") ||
      text.includes("strength") ||
      text.includes("lift") ||
      text.includes("gym") ||
      text.includes("dumbbell")
    ) {
      return "dumbbell";
    }
    if (text.includes("cycle") || text.includes("bike")) {
      return "bike";
    }
    if (text.includes("walk") || text.includes("step")) {
      return "shoe-print";
    }

    // Default fallback
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

  const handleUpdateProgress = async (progress: number) => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in to update progress");
        return;
      }

      const statsRef = doc(
        db,
        "challenges",
        challenge.id,
        "participants",
        currentUser.uid
      );

      // Update the progress
      await updateDoc(statsRef, {
        progress: progress,
      });

      // Check for Completion
      if (progress === 100) {
        await checkAndAwardBadge(currentUser.uid);
      }

      setShowProgressModal(false);
      fetchParticipants(currentChallenge);
      Alert.alert("Success", "Progress updated successfully!");
    } catch (error: any) {
      console.error("Update error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

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
        <Image
          source={{
            uri:
              currentChallenge.imageUrl ||
              "https://images.unsplash.com/photo-1599058917212-dc7e845ab4c2",
          }}
          style={styles.image}
        />
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

          <View style={styles.buttonContainer}>
            {isParticipant ? (
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
