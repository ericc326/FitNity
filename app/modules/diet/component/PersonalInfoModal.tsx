import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMealPlan } from "./MealPlanContext";

interface PersonalInfo {
  goal: string;
  dietaryRestrictions: string[];
  allergies: string[];
  targetCalories: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  activityLevel: string;
}

interface PersonalInfoModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (dietInfo: any) => void;
}

const PersonalInfoModal: React.FC<PersonalInfoModalProps> = ({
  visible,
  onClose,
  onComplete,
}) => {
  const { healthInfo } = useMealPlan();
  const [currentStep, setCurrentStep] = useState(0);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    age: "",
    gender: "",
    weight: "",
    height: "",
    activityLevel: "",
    goal: "",
    dietaryRestrictions: [],
    allergies: [],
    targetCalories: "",
  });

  const [allergyInput, setAllergyInput] = useState("");

  const steps = ["Activity & Goal", "Dietary Preferences"];

  const activityLevels = [
    { label: "Sedentary", value: "sedentary" },
    { label: "Lightly active", value: "lightly_active" },
    { label: "Moderately active", value: "moderately_active" },
    { label: "Very active", value: "very_active" },
  ];

  const goals = [
    { label: "Lose Weight", value: "lose_weight" },
    { label: "Maintain Weight", value: "maintain_weight" },
    { label: "Gain Weight", value: "gain_weight" },
  ];

  const dietaryRestrictions = [
    "Vegetarian",
    "Vegan",
    "Gluten-Free",
    "Dairy-Free",
    "Keto",
    "Paleo",
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleComplete = () => {
    if (!personalInfo.goal) {
      Alert.alert("Missing Goal", "Please select a caloric goal.");
      return;
    }

    const calculatedCalories = calculateTargetCalories();

    // Standard Balanced Ratio: 30% Protein, 40% Carbs, 30% Fat
    const targetProtein = Math.round((calculatedCalories * 0.3) / 4); // 4 kcal per gram
    const targetCarbs = Math.round((calculatedCalories * 0.4) / 4); // 4 kcal per gram
    const targetFat = Math.round((calculatedCalories * 0.3) / 9);

    // Data specifically for the 'dietinfo' subcollection
    const dietInfoData = {
      dietaryRestrictions: personalInfo.dietaryRestrictions,
      allergies: personalInfo.allergies,
      goal: personalInfo.goal,
      targetCalories: calculatedCalories.toString(),
      targetProtein: targetProtein.toString(),
      targetCarbs: targetCarbs.toString(),
      targetFat: targetFat.toString(),
      updatedAt: new Date().toISOString(),
    };

    onComplete(dietInfoData);
  };

  const calculateTargetCalories = (): number => {
    // Priority 1: Data from Firebase (healthInfo)
    // Priority 2: Fallback to local state if Firebase is still empty
    const age = parseInt(healthInfo?.age || personalInfo.age || "25");
    const weight = parseFloat(
      healthInfo?.weight || personalInfo.weight || "70"
    );
    const height = parseFloat(
      healthInfo?.height || personalInfo.height || "170"
    );
    const gender = healthInfo?.gender || personalInfo.gender || "male";

    // Mifflin-St Jeor Equation
    let bmr = 10 * weight + 6.25 * height - 5 * age;
    bmr = gender.toLowerCase() === "male" ? bmr + 5 : bmr - 161;

    // Use activity level from modal or existing level from Firebase
    const activeVal =
      personalInfo.activityLevel ||
      healthInfo?.level?.toLowerCase() ||
      "sedentary";

    const multipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
    };

    let tdee =
      bmr * (multipliers[activeVal as keyof typeof multipliers] || 1.2);

    // Apply Goal Offset
    if (personalInfo.goal === "lose_weight") tdee -= 500;
    else if (personalInfo.goal === "gain_weight") tdee += 300;

    return Math.round(tdee);
  };

  const toggleDietaryRestriction = (restriction: string) => {
    setPersonalInfo((prev) => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter((r) => r !== restriction)
        : [...prev.dietaryRestrictions, restriction],
    }));
  };

  const toggleAllergy = (allergy: string) => {
    setPersonalInfo((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter((a) => a !== allergy)
        : [...prev.allergies, allergy],
    }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Caloric Goal & Activity
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Caloric Goal</Text>
            <Text style={styles.stepDescription}>
              Select your primary nutritional target.
            </Text>
            {goals.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[
                  styles.radioButton,
                  personalInfo.goal === g.value && styles.radioButtonActive,
                ]}
                onPress={() =>
                  setPersonalInfo((p) => ({ ...p, goal: g.value }))
                }
              >
                <Text>{g.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Activity Level</Text>
              {activityLevels.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.radioButton,
                    personalInfo.activityLevel === level.value &&
                      styles.radioButtonActive,
                  ]}
                  onPress={() =>
                    setPersonalInfo((prev) => ({
                      ...prev,
                      activityLevel: level.value,
                    }))
                  }
                >
                  <Text>{level.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Dietary Preferences</Text>
            <Text style={styles.inputLabel}>Restrictions</Text>
            <View style={styles.checkboxGrid}>
              {dietaryRestrictions.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.checkboxButton,
                    personalInfo.dietaryRestrictions.includes(r) &&
                      styles.checkboxButtonActive,
                  ]}
                  onPress={() => toggleDietaryRestriction(r)}
                >
                  <Text>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.inputLabel, { marginTop: 20 }]}>
              Allergies
            </Text>
            <View style={styles.customInputContainer}>
              <TextInput
                style={styles.customInput}
                value={allergyInput}
                onChangeText={setAllergyInput}
                placeholder="Add allergy"
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  if (allergyInput) {
                    toggleAllergy(allergyInput);
                    setAllergyInput("");
                  }
                }}
              >
                <Ionicons name="add" size={20} color="#4CAF50" />
              </TouchableOpacity>
            </View>
            <View style={styles.tagContainer}>
              {personalInfo.allergies.map((a) => (
                <View key={a} style={styles.tag}>
                  <Text style={styles.tagText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dietary Assessment</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.content}>{renderStep()}</ScrollView>
        <View style={styles.footer}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={{ color: "white" }}>
              {currentStep === steps.length - 1 ? "Save Diet Profile" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1e3ec",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: { paddingVertical: 20 },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  inputGroup: { marginTop: 20 },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  radioButton: {
    padding: 12,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 10,
  },
  radioButtonActive: {
    borderColor: "#4CAF50",
    backgroundColor: "#E8F5E8",
  },
  checkboxGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  checkboxButton: {
    padding: 10,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  checkboxButtonActive: {
    borderColor: "#4CAF50",
    backgroundColor: "#E8F5E8",
  },
  customInputContainer: {
    flexDirection: "row",
    gap: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  addButton: {
    padding: 12,
    backgroundColor: "#E8F5E8",
    borderRadius: 12,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  tag: {
    backgroundColor: "#FF5722",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: "white",
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  backButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  nextButton: {
    padding: 12,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
});

export default PersonalInfoModal;
