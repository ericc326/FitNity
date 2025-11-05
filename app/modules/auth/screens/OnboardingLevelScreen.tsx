import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "OnboardingLevel">;

const OnboardingLevelScreen: React.FC<Props> = ({ navigation, route }) => {
  const { gender, weight, height } = route.params;
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const levels = ["Beginner", "Intermediate", "Advanced"];

  const handleNext = async () => {
    if (!selectedLevel) return;

    navigation.navigate("OnboardingHealth", {
      gender,
      weight,
      height,
      level: selectedLevel,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Choose Your Level</Text>
      <Text style={styles.headerSubtitle}>
        Select your current fitness level to get personalized workouts.
      </Text>

      <View style={styles.levelContainer}>
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
          style={styles.navBtn}
          onPress={handleNext}
          disabled={!selectedLevel}
        >
          <Text
            style={[
              styles.navBtnText,
              !selectedLevel && { color: "#bbb" },
            ]}
          >
            {">"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#262135",
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    marginBottom: 30,
  },
  levelContainer: {
    width: "100%",
    marginBottom: 40,
  },
  levelButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  levelSelected: {
    backgroundColor: "#7b68ee",
  },
  levelText: {
    fontSize: 16,
    color: "#333",
  },
  levelTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 32,
    marginTop: 32,
    width: "100%",
  },
  navBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  navBtnText: {
    fontSize: 18,
    color: "#7b68ee",
    fontWeight: "bold",
  },
});

export default OnboardingLevelScreen;
