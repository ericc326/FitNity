import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChallengesStackParamList } from "../../navigation/CommunityNavigator";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db, auth, storage } from "../../../../../firebaseConfig";
import { ref as storageRef, deleteObject } from "firebase/storage";
import LoadingIndicator from "../../../../components/LoadingIndicator";

type NavigationProp = NativeStackNavigationProp<
  ChallengesStackParamList,
  "ChallengesList"
>;

type Challenge = {
  id: string;
  title: string;
  duration: number;
  imageUrl?: string;
  createdBy: string;
  participantCount: number;
};

type ChallengeCardProps = {
  item: Challenge;
  onPress: () => void;
  onOptions: () => void;
  userProgress?: number | null;
};

const ChallengeCard: React.FC<ChallengeCardProps> = ({
  item,
  onPress,
  onOptions,
  userProgress,
}) => {
  const isCreator = item.createdBy === auth.currentUser?.uid;
  const [imageLoading, setImageLoading] = useState(true);

  React.useEffect(() => {
    if (item.imageUrl) {
      setImageLoading(true);
    } else {
      setImageLoading(false);
    }
  }, [item.imageUrl]);

  const isCompleted = userProgress === 100;
  const progressColor = isCompleted ? "#4CAF50" : "#4a90e2";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: item.imageUrl
              ? item.imageUrl
              : "https://images.unsplash.com/photo-1599058917212-dc7e845ab4c2",
          }}
          style={styles.image}
          onLoadEnd={() => setImageLoading(false)}
          onError={() => setImageLoading(false)}
        />
        {imageLoading && (
          <View style={styles.loadingOverlay}>
            <LoadingIndicator size="small" color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.title}</Text>
          {isCreator && (
            <TouchableOpacity onPress={onOptions} style={styles.optionsButton}>
              <MaterialCommunityIcons
                name="dots-vertical"
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.details}>{item.duration} days</Text>
        <Text style={styles.details}>
          {item.participantCount || 0} participants
        </Text>

        {userProgress !== undefined && userProgress !== null && (
          <View style={styles.progressContainer}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>My Progress</Text>
              <Text style={[styles.progressPercent, { color: progressColor }]}>
                {userProgress}%
              </Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${userProgress}%`, backgroundColor: progressColor },
                ]}
              />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const ChallengesTab = () => {
  const navigation = useNavigation<NavigationProp>();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Store progress in a map: { challengeId: progressValue }
  const [userProgressMap, setUserProgressMap] = useState<
    Record<string, number>
  >({});

  const fetchChallenges = async () => {
    try {
      const currentUser = auth.currentUser;
      const challengesRef = collection(db, "challenges");
      const q = query(challengesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const challengesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch user progress
      if (currentUser) {
        const newProgressMap: Record<string, number> = {};

        // Use Promise.all to fetch progress in parallel for speed
        await Promise.all(
          challengesData.map(async (challenge: any) => {
            // Check if user is a participant first (saves reads)
            if (
              challenge.participants &&
              challenge.participants.includes(currentUser.uid)
            ) {
              try {
                // Fetch the specific participant document
                const participantDocRef = doc(
                  db,
                  "challenges",
                  challenge.id,
                  "participants",
                  currentUser.uid
                );

                const participantSnap = await getDoc(participantDocRef);

                if (participantSnap.exists()) {
                  const data = participantSnap.data();
                  newProgressMap[challenge.id] = data.progress || 0;
                }
              } catch (e) {
                console.warn(`Error fetching progress for ${challenge.id}`, e);
              }
            }
          })
        );

        setUserProgressMap(newProgressMap);
      }

      setChallenges(challengesData);
    } catch (error) {
      console.error("Error fetching challenges:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchChallenges();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChallenges();
    setRefreshing(false);
  };

  const handleViewChallenge = (challenge: any) => {
    navigation.navigate("ChallengeDetails", { challenge });
  };

  const handleOptions = (challenge: any) => {
    Alert.alert(
      "Challenge Options",
      "What would you like to do?",
      [
        {
          text: "Edit",
          onPress: () => {
            navigation.navigate("EditChallenge", { challenge });
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Delete Challenge",
              "Are you sure you want to delete this challenge?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      // First, delete the image if it exists
                      if (challenge.imageUrl) {
                        try {
                          // Extract the file path from the URL
                          const imageUrl = new URL(challenge.imageUrl);
                          const imagePath = decodeURIComponent(
                            imageUrl.pathname.split("/o/")[1]
                          );
                          const imageRef = storageRef(storage, imagePath);

                          await deleteObject(imageRef);
                        } catch (imageError) {
                          console.error("Error deleting image:", imageError);
                        }
                      }
                      // Retrieve participants subcollection
                      const participantsRef = collection(
                        db,
                        "challenges",
                        challenge.id,
                        "participants"
                      );
                      const participantsSnapshot =
                        await getDocs(participantsRef);

                      // Delete all participant documents
                      const deleteParticipantPromises =
                        participantsSnapshot.docs.map((doc) =>
                          deleteDoc(doc.ref)
                        );
                      await Promise.all(deleteParticipantPromises);
                      // Then delete the challenge document
                      await deleteDoc(doc(db, "challenges", challenge.id));

                      // Refresh the challenges list
                      fetchChallenges();

                      // Show success message
                      Alert.alert("Success", "Challenge deleted successfully");
                    } catch (error) {
                      Alert.alert("Error", "Failed to delete challenge");
                    }
                  },
                },
              ]
            );
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Challenges</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate("CreateChallenge")}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChallengeCard
            item={item}
            onPress={() => handleViewChallenge(item)}
            onOptions={() => handleOptions(item)}
            userProgress={userProgressMap[item.id]}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
      />
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  createButton: {
    backgroundColor: "#4a90e2",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  imageContainer: {
    position: "relative",
    width: 90,
    height: 90,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#333",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  info: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionsButton: {
    padding: 4,
  },
  details: {
    color: "#aaa",
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressLabel: {
    color: "#aaa",
    fontSize: 12,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: "bold",
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: "#444",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
});

export default ChallengesTab;
