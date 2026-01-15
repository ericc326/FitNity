import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "OnboardingLevel">;

const OnboardingLevelScreen: React.FC<Props> = ({ navigation, route }) => {
  const { gender, weight, height } = route.params;
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const levels = ["Beginner", "Intermediate", "Advanced"];
  const goals = ["Build Muscle", "Lose Weight", "Increase Strength"];

  const handleNext = async () => {
    if (!selectedLevel || !selectedGoal) return;

    navigation.navigate("OnboardingHealth", {
      gender,
      weight,
      height,
      level: selectedLevel,
      goal: selectedGoal,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: "center" }}
      >
        <Text style={styles.headerTitle}>Personalize Your Plan</Text>

        {/* --- GOAL SECTION --- */}
        <Text style={styles.sectionLabel}>What is your fitness goal?</Text>
        <View style={styles.selectionContainer}>
          {goals.map((goal) => (
            <TouchableOpacity
              key={goal}
              style={[
                styles.chip,
                selectedGoal === goal && styles.chipSelected,
              ]}
              onPress={() => setSelectedGoal(goal)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedGoal === goal && styles.chipTextSelected,
                ]}
              >
                {goal}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* --- LEVEL SECTION --- */}
        <Text style={styles.sectionLabel}>What is your level?</Text>
        <View style={styles.selectionContainer}>
          {levels.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelButton,
                selectedLevel === level && styles.levelSelected,
              ]}
              onPress={() => setSelectedLevel(level)}
            >
              <Text
                style={[
                  styles.levelText,
                  selectedLevel === level && styles.levelTextSelected,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.navBtnText}>{"<"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.navBtn,
              (!selectedLevel || !selectedGoal) && { opacity: 0.5 },
            ]}
            onPress={handleNext}
            disabled={!selectedLevel || !selectedGoal}
          >
            <Text style={styles.navBtnText}>{">"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 20 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#262135",
    marginTop: 20,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    alignSelf: "flex-start",
    marginTop: 20,
    marginBottom: 15,
  },
  selectionContainer: { width: "100%", marginBottom: 10 },
  levelButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  levelSelected: { backgroundColor: "#7b68ee" },
  levelText: { fontSize: 16, color: "#333" },
  levelTextSelected: { color: "#fff", fontWeight: "bold" },
  chip: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  chipSelected: { backgroundColor: "#7b68ee", borderColor: "#7b68ee" },
  chipText: { color: "#333", textAlign: "center" },
  chipTextSelected: { color: "#fff", fontWeight: "bold" },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 30,
    paddingBottom: 20,
  },
  navBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  navBtnText: { fontSize: 18, color: "#7b68ee", fontWeight: "bold" },
});

export default OnboardingLevelScreen;
