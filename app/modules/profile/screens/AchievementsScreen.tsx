import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { db, auth } from "../../../../firebaseConfig";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import LoadingIndicator from "../../../components/LoadingIndicator";

interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedAt: any;
  icon: string;
  challengeId?: string;
}

const AchievementsScreen = () => {
  const navigation = useNavigation();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Reference to users/{uid}/achievements
    const achievementsRef = collection(
      db,
      "users",
      currentUser.uid,
      "achievements"
    );
    const q = query(achievementsRef, orderBy("earnedAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAchievements: Achievement[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Achievement[];

      setAchievements(fetchedAchievements);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderBadge = ({ item }: { item: Achievement }) => {
    const dateEarned = item.earnedAt?.toDate
      ? item.earnedAt.toDate().toLocaleDateString()
      : "Unknown Date";

    return (
      <View style={styles.badgeCard}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={(item.icon as any) || "trophy"}
            size={40}
            color="#FFD700"
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.badgeTitle}>{item.title}</Text>
          <Text style={styles.badgeDate}>Earned on {dateEarned}</Text>
          <Text style={styles.badgeDesc}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Achievements</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <LoadingIndicator />
      ) : (
        <FlatList
          data={achievements}
          keyExtractor={(item) => item.id}
          renderItem={renderBadge}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="shield-outline"
                size={60}
                color="#444"
              />
              <Text style={styles.emptyText}>No badges earned yet.</Text>
              <Text style={styles.emptySubText}>
                Complete challenges to earn digital badges!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  listContent: {
    padding: 16,
  },
  badgeCard: {
    backgroundColor: "#3C3952",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4a90e2",
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  textContainer: {
    flex: 1,
  },
  badgeTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  badgeDate: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 4,
  },
  badgeDesc: {
    color: "#ddd",
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
  },
  emptySubText: {
    color: "#aaa",
    marginTop: 8,
  },
});

export default AchievementsScreen;
