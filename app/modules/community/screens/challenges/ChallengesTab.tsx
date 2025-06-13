import React, { useState, useEffect } from "react";
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
import { useNavigation } from "@react-navigation/native";
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
};

const ChallengeCard: React.FC<ChallengeCardProps> = ({ item, onPress, onOptions }) => {
  const isCreator = item.createdBy === auth.currentUser?.uid;
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={{ position: "relative" }}>
        <Image
          source={{
            uri: item.imageUrl
              ? item.imageUrl
              : "https://images.unsplash.com/photo-1599058917212-dc7e845ab4c2",
          }}
          style={styles.image}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
          onError={() => setImageLoading(false)}
        />
        {imageLoading && <LoadingIndicator size="small" color="#fff" />}
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
      </View>
    </TouchableOpacity>
  );
};

const ChallengesTab = () => {
  const navigation = useNavigation<NavigationProp>();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChallenges = async () => {
    try {
      const challengesRef = collection(db, "challenges");
      const q = query(challengesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const challengesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setChallenges(challengesData);
    } catch (error) {
      console.error("Error fetching challenges:", error);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChallenges();
    setRefreshing(false);
  };

  const handleViewChallenge = (challenge: any) => {
    navigation.navigate("ChallengeDetails", { challenge });
  };

  const handleOptions = (challenge: any) => {
    Alert.alert("Challenge Options", "What would you like to do?", [
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
              {
                text: "Cancel",
                style: "cancel",
              },
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
                    // Delete participants subcollection first
                    const participantsRef = collection(
                      db,
                      "challenges",
                      challenge.id,
                      "participants"
                    );
                    const participantsSnapshot = await getDocs(participantsRef);

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
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
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
  image: {
    width: 90,
    height: 90,
    borderRadius: 8,
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
});

export default ChallengesTab;
