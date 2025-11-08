import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ProfileStackParamList } from "../navigation/ProfileNavigator";
import { app, auth, db } from "../../../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

type ProfileScreenNavigationProp =
  NativeStackNavigationProp<ProfileStackParamList>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    // Add other user fields as needed
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Auth" }],
            })
          );
          return;
        }

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserData({
            name: userDoc.data().name,
            email: userDoc.data().email,
          });
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load user data");
      }
    };

    loadUserData();
  }, [navigation]);

  const navigateToEditProfile = () => {
    navigation.navigate("EditProfile");
  };

  const navigateToSettings = () => {
    navigation.navigate("Settings");
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Auth" }],
        })
      );
    } catch (error) {
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const callDeleteFunction = async () => {
    if (!auth.currentUser) throw new Error("Client not signed in");
    // refresh token to be safe
    const idToken = await auth.currentUser.getIdToken(true);
    const region = "us-central1"; // change if your function uses a different region
    const project = app?.options?.projectId;
    if (!project) throw new Error("Missing firebase project id");
    const url = `https://${region}-${project}.cloudfunctions.net/deleteUserAndData`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({}),
    });

    const text = await res.text();
    if (res.status === 200) {
      return text;
    }

    // parse error if possible
    let msg = text;
    try {
      const json = JSON.parse(text);
      msg = json?.error?.message || json?.error?.note || text;
    } catch {}
    throw new Error(`Function error ${res.status}: ${msg}`);
  };

  // confirmation wrapper used by UI
  const handleDeleteAccount = () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No authenticated user.");
      return;
    }

    Alert.alert(
      "Delete account",
      "Are you sure you want to permanently delete your account and all data? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await callDeleteFunction();
              Alert.alert(
                "Account deleted",
                "Your account and all associated data were deleted successfully.",
                [
                  {
                    text: "OK",
                    onPress: async () => {
                      await auth.signOut().catch(() => null);
                      navigation.dispatch(
                        CommonActions.reset({
                          index: 0,
                          routes: [{ name: "Auth" }],
                        })
                      );
                    },
                  },
                ],
                { cancelable: false }
              );
            } catch (err: any) {
              Alert.alert("Delete failed", err.message || String(err));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View>
        {/* Profile Header */}
        <View style={styles.header}>
          <Image
            source={require("../../../assets/profile.png")}
            style={styles.profileImage}
          />
          <Text style={styles.userName}>{userData?.name || "Loading..."}</Text>
          <Text style={styles.userEmail}>
            {userData?.email || "Loading..."}
          </Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={navigateToEditProfile}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>12.5k</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>48</Text>
            <Text style={styles.statLabel}>Hours</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <MaterialCommunityIcons
                name="account"
                size={24}
                color="#4a90e2"
              />
              <Text style={styles.menuItemText}>Personal Information</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#8a84a5"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <MaterialCommunityIcons name="trophy" size={24} color="#4a90e2" />
              <Text style={styles.menuItemText}>Achievements</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#8a84a5"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={navigateToSettings}
          >
            <View style={styles.menuItemLeft}>
              <MaterialCommunityIcons name="cog" size={24} color="#4a90e2" />
              <Text style={styles.menuItemText}>Settings</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#8a84a5"
            />
          </TouchableOpacity>
          {/* Logout Button */}
          <TouchableOpacity
            style={[styles.menuItem, styles.logoutButton]}
            onPress={handleLogout}
          >
            <View style={styles.menuItemLeft}>
              <MaterialCommunityIcons name="logout" size={24} color="#FFA726" />
              <Text style={[styles.menuItemText, styles.logoutText]}>
                Logout
              </Text>
            </View>
          </TouchableOpacity>
          {/* Delete Account Button */}
          <TouchableOpacity
            style={[styles.menuItem, styles.logoutButton, { marginTop: 12 }]}
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            <View style={styles.menuItemLeft}>
              <MaterialCommunityIcons name="delete" size={24} color="#FF4444" />
              <Text style={[styles.menuItemText, styles.deleteAccText]}>
                {deleting ? "Deleting..." : "Delete Account"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  header: {
    alignItems: "center",
    padding: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  userName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  userEmail: {
    color: "#8a84a5",
    fontSize: 16,
    marginBottom: 15,
  },
  editButton: {
    backgroundColor: "#4a90e2",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    backgroundColor: "#3C3952",
    marginHorizontal: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  statBox: {
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  statLabel: {
    color: "#8a84a5",
    fontSize: 14,
  },
  menuContainer: {
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#3C3952",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 15,
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: "#3C3952",
  },
  logoutText: {
    color: "#FFA726",
  },
  deleteAccText: {
    color: "#FF4444",
  },
});

export default ProfileScreen;
