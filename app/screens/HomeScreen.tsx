import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AIChatBox from "../components/AIChatBox";

const HomeScreen: React.FC = () => {
  const [showChat, setShowChat] = useState(false);
  const insets = useSafeAreaInsets(); // Get insets

  return (
    <View style={{ flex: 1, backgroundColor: "#262135" }}>
      <ScrollView
        contentContainerStyle={{
          paddingLeft: 12,
          paddingRight: 12,
          paddingBottom: 20,
        }}
      >
        <SafeAreaView style={{ backgroundColor: "#262135" }}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.hiText}>Hi!,</Text>
              <Text style={styles.nameText}>Youssef</Text>
              <View style={styles.badgeRow}>
                <Text style={styles.badge}>Beginner</Text>
                <Text style={[styles.badge, styles.trainingBadge]}>
                  Training Days
                </Text>
                <Text style={[styles.badge, styles.communityBadge]}>
                  community
                </Text>
              </View>
            </View>
            <Image
              source={require("../assets/profile.png")}
              style={styles.profilePic}
            />
          </View>
        </SafeAreaView>
        {/* Statistic Section */}
        <View style={styles.statistics}>
          <View style={styles.bmiBox}>
            <Text style={styles.statLabel}>BMI (Body Mass Index)</Text>
            <Text style={styles.statValue}>20.1</Text>
            <Text style={styles.statDesc}>You have a normal weight</Text>
          </View>
          <View style={styles.calorieBox}>
            <Text style={styles.statLabel}>Calorie</Text>
            <Text style={styles.statValue}>349 kcal</Text>
            {/* You can insert a chart/graph here */}
          </View>
        </View>

        {/* Calendar Section */}
        <View style={styles.calendar}>
          <Text style={styles.monthText}>August 2024</Text>
          <View style={styles.dateRow}>
            {["19", "20", "21", "22", "23", "24", "25"].map((date, i) => (
              <View key={i} style={styles.dateBox}>
                <Text style={styles.dateText}>{date}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Create Workout Button */}
        <TouchableOpacity style={styles.createWorkoutBtn}>
          <Text style={styles.createWorkoutText}>Create Workout</Text>
        </TouchableOpacity>

        {/* Suggestion Workouts */}
        <Text style={styles.sectionTitle}>Suggestion Workouts</Text>
        <View style={styles.workoutCard}>
          {/* <Image
            source={require("../../assets/abs_beginner.jpg")}
            style={styles.workoutImage}
          /> */}
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutTitle}>ABS BEGINNER</Text>
            <Text style={styles.workoutMeta}>⏱ 78 min • 🔥 28 Exercises</Text>
            <TouchableOpacity style={styles.startBtn}>
              <Text style={styles.startBtnText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {/* Floating Chat Icon */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => setShowChat(true)}
      >
        <MaterialCommunityIcons
          name="robot"
          size={30}
          color="#4a90e2"
          style={styles.chatIcon}
        />
      </TouchableOpacity>
      <AIChatBox visible={showChat} onClose={() => setShowChat(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#262135" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hiText: { color: "#fff", fontSize: 36, fontWeight: "bold", paddingLeft: 10 },
  nameText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    paddingLeft: 10,
  },
  badgeRow: { flexDirection: "row", marginTop: 8, gap: 6 },
  badge: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 12,
  },
  trainingBadge: { backgroundColor: "#f55" },
  communityBadge: { backgroundColor: "#4a90e2", color: "#fff" },
  profilePic: { width: 100, height: 100, borderRadius: 25 },
  statistics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  bmiBox: {
    backgroundColor: "#5a6df0",
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginRight: 10,
  },
  calorieBox: {
    backgroundColor: "#3b3f55",
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginLeft: 10,
  },
  statLabel: { color: "#fff", fontSize: 12 },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  statDesc: { color: "#fff", fontSize: 12, marginTop: 4 },
  calendar: { marginTop: 30 },
  monthText: { color: "#fff", fontSize: 16, marginBottom: 10 },
  dateRow: { flexDirection: "row", justifyContent: "space-between" },
  dateBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#444",
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: { color: "#fff" },
  createWorkoutBtn: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  createWorkoutText: { fontWeight: "bold" },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 30,
    marginBottom: 10,
  },
  workoutCard: {
    flexDirection: "row",
    backgroundColor: "#333",
    borderRadius: 12,
    overflow: "hidden",
  },
  workoutImage: {
    width: 100,
    height: 100,
  },
  workoutInfo: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  workoutTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  workoutMeta: { color: "#ccc", fontSize: 12 },
  startBtn: {
    backgroundColor: "#f57c00",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  startBtnText: { color: "#fff", fontWeight: "bold" },
  chatButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 12,
    elevation: 5,
  },
  chatIcon: { width: 30, height: 30 },
  chatModal: {
    backgroundColor: "#1e1e2e",
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  chatTitle: { fontSize: 20, color: "#fff", marginBottom: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30,30,46,0.7)", // semi-transparent background
    justifyContent: "center",
    alignItems: "center",
  },
  chatModalBox: {
    backgroundColor: "#1e1e2e",
    borderRadius: 16,
    padding: 24,
    minWidth: 280,
    alignItems: "center",
  },
});

export default HomeScreen;
