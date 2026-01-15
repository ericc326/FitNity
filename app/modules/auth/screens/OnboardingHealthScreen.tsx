import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthNavigator";
import { auth, db } from "../../../../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type Props = NativeStackScreenProps<AuthStackParamList, "OnboardingHealth">;

const OnboardingHealthScreen: React.FC<Props> = ({ navigation, route }) => {
  const { gender, weight, height, level, goal } = route.params;
  const [healthInfo, setHealthInfo] = useState("");

  const handleFinish = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to save health info.");
      return;
    }

    try {
      // Calculate BMI
      const weightNum = parseFloat(weight);
      const heightNum = parseFloat(height);
      let bmi = null;
      if (weightNum && heightNum) {
        const heightM = heightNum / 100;
        bmi = Number((weightNum / (heightM * heightM)).toFixed(1));
      }
      // Reference to the user's healthinfo subcollection
      const healthInfoRef = collection(
        db,
        "users",
        currentUser.uid,
        "healthinfo"
      );

      const healthData = {
        gender,
        weight,
        height,
        level,
        goal,
        bmi,
        healthInfo,
        createdAt: serverTimestamp(),
      };

      await addDoc(healthInfoRef, healthData);

      // Navigate to HomeTab after saving
      navigation.getParent()?.reset({
        index: 0,
        routes: [{ name: "HomeTab" }],
      });
    } catch (error: any) {
      Alert.alert("Error", `Failed to save health info: ${error.message}`);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBox}>
          <Text style={styles.headerTitle}>Health Information</Text>
          <Text style={styles.headerSubtitle}>
            Let us know if you have any health conditions or notes.
          </Text>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Health Info</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={healthInfo}
            onChangeText={setHealthInfo}
            placeholder="e.g. Asthma, diabetes, etc."
            placeholderTextColor="#aaa"
            multiline
          />
        </View>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.navBtnText}>{"<"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={handleFinish}>
            <MaterialCommunityIcons name="check" size={28} color="#4caf50" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", justifyContent: "center" },
  headerBox: {
    borderWidth: 2,
    borderColor: "#2a5ba5",
    margin: 24,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },
  inputGroup: {
    marginHorizontal: 32,
    marginVertical: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: "#222",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#222",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 32,
    marginTop: 32,
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

export default OnboardingHealthScreen;
