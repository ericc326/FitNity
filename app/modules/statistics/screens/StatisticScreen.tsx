import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const StatisticScreen = () => {
  const [selectedTab, setSelectedTab] = useState<"day" | "week" | "month">(
    "day"
  );
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Statistics</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerRow}>
            <Text style={styles.date}>June 06, 2024</Text>
            <Text style={styles.avgCalories}>
              Weekly Average{"\n"}
              <Text style={styles.calVal}>102 CAL</Text>
            </Text>
          </View>

          <Text style={styles.subTitle}>Your Statistics</Text>

          <View style={styles.tabRow}>
            {["day", "week", "month"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  selectedTab === tab && styles.tabButtonSelected,
                ]}
                onPress={() => setSelectedTab(tab as "day" | "week" | "month")}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedTab === tab && styles.tabTextSelected,
                  ]}
                >
                  {tab[0].toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* BMI Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>BMI (Body Mass Index)</Text>
            <Text style={styles.cardSubtitle}>You have a normal weight</Text>
            <View style={styles.bmiCircle}>
              <Text style={styles.bmiValue}>20.1</Text>
            </View>
          </View>

          {/* Heart Rate */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Heart Rate</Text>
            <Text style={styles.heartValue}>78 BPM</Text>
            <Text style={styles.timeLabel}>3 mins ago</Text>
          </View>

          {/* Calories & Tips */}
          <View style={styles.recoveryCard}>
            <Text style={styles.cardTitle}>Calories</Text>
            <Text style={styles.cardSubtitle}>550 cal</Text>
            <Text style={styles.tipTitle}>Recovery Tips</Text>
            <Text style={styles.tipText}>
              🔹 Stay hydrated{"\n"}
              🔹 Include stretching in your routine{"\n"}
              🔹 Get at least 7–8 hours of sleep{"\n"}
              🔹 Eat a protein-rich post-workout meal
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1c1633",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  backButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  date: {
    color: "#fff",
    fontSize: 14,
  },
  avgCalories: {
    color: "#ccc",
    fontSize: 12,
    textAlign: "right",
  },
  calVal: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  subTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  tabRow: {
    backgroundColor: "#d3d3d3",
    borderRadius: 24,
    flexDirection: "row",
    padding: 4,
    justifyContent: "space-between",
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  tabButtonSelected: {
    backgroundColor: "#1c1633",
  },
  tabText: {
    color: "#333",
  },
  tabTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#29204a",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cardSubtitle: {
    color: "#ccc",
    marginTop: 4,
  },
  bmiCircle: {
    marginTop: 10,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  bmiValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f55",
  },
  heartValue: {
    color: "#7de0ff",
    fontSize: 16,
    marginTop: 8,
  },
  timeLabel: {
    marginTop: 10,
    backgroundColor: "#e0b3ff",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    color: "#333",
  },
  recoveryCard: {
    backgroundColor: "#4693ff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 30,
  },
  tipTitle: {
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 4,
    color: "#000",
  },
  tipText: {
    color: "#000",
    fontSize: 14,
  },
});

export default StatisticScreen;
