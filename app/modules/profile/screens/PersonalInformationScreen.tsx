import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  doc,
  setDoc,
  serverTimestamp,
  addDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { db } from "../../../../firebaseConfig";
import LoadingIndicator from "../../../components/LoadingIndicator";

type HealthInfo = {
  weight?: string | number;
  height?: string | number;
  age?: string | number;
  bmi?: number | null;
  level?: string;
  gender?: string;
  bmr?: number | null;
  tdee?: number | null;
  healthInfo?: string;
  createdAt?: any;
  updatedAt?: any;
};

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const GENDERS = ["Male", "Female"];

const PersonalInformationScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [healthInfoDocId, setHealthInfoDocId] = useState<string | null>(null);

  const [gender, setGender] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [heightCm, setHeightCm] = useState<string>("");
  const [fitnessLevel, setFitnessLevel] = useState<string>("");
  const [healthInfoNote, setHealthInfoNote] = useState<string>("");
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const bmi = useMemo(() => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    if (!w || !h || h <= 0) return "";
    return (w / Math.pow(h / 100, 2)).toFixed(1);
  }, [weightKg, heightCm]);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUid(null);
        setLoading(false);
        return;
      }
      setUid(user.uid);
      await loadHealthInfo(user.uid);
    });
    return unsub;
  }, []);

  const loadHealthInfo = async (userId: string) => {
    try {
      const colRef = collection(db, "users", userId, "healthinfo");
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        setHealthInfoDocId(docSnap.id);
        const data = docSnap.data() as HealthInfo;
        if (data.weight != null) setWeightKg(String(data.weight));
        if (data.height != null) setHeightCm(String(data.height));
        if (data.age != null) setAge(String(data.age));
        if (data.level) setFitnessLevel(String(data.level));
        if (data.gender) setGender(String(data.gender));
        if (data.healthInfo) setHealthInfoNote(String(data.healthInfo));
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load health info.");
    } finally {
      setLoading(false);
    }
  };

  const getBmiColor = (val: string) => {
    const num = parseFloat(val);
    if (!num) return "#fff";
    if (num < 18.5) return "#5ac8fa"; // Underweight (Blue)
    if (num < 25) return "#4cd964"; // Healthy (Green)
    if (num < 30) return "#ffcc00"; // Overweight (Yellow)
    return "#ff3b30"; // Obese (Red)
  };

  const handleSave = async () => {
    if (!uid) {
      Alert.alert("Error", "Please sign in to update your info.");
      return;
    }
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    const a = parseFloat(age);

    if (!w || w <= 0 || !h || h <= 0) {
      Alert.alert("Invalid Input", "Enter valid weight and height.");
      return;
    }

    let calculatedBmr = null;
    let calculatedTdee = null;

    // Only calculate if have ALL required fields (Weight, Height, Age, Gender, Level)
    if (w && h && a && gender && fitnessLevel) {
      // A. Calculate BMR (Mifflin-St Jeor)
      let bmr = 10 * w + 6.25 * h - 5 * a;
      if (gender === "Male") {
        bmr += 5;
      } else {
        bmr -= 161;
      }
      calculatedBmr = Math.round(bmr);

      // B. Calculate TDEE (Multiplier)
      let multiplier = 1.2;
      if (fitnessLevel === "Intermediate") multiplier = 1.55;
      if (fitnessLevel === "Advanced") multiplier = 1.725;

      calculatedTdee = Math.round(bmr * multiplier);
    }

    const payload: HealthInfo = {
      weight: weightKg,
      height: heightCm,
      age: age || "",
      bmi: bmi ? Number(bmi) : null,
      level: fitnessLevel,
      gender: gender || "",
      healthInfo: healthInfoNote || "",
      bmr: calculatedBmr,
      tdee: calculatedTdee,
      updatedAt: serverTimestamp(),
    };

    try {
      setSaving(true);
      const colRef = collection(db, "users", uid, "healthinfo");
      if (healthInfoDocId) {
        await setDoc(doc(colRef, healthInfoDocId), payload, { merge: true });
      } else {
        const newRef = await addDoc(colRef, payload);
        setHealthInfoDocId(newRef.id);
      }
      Alert.alert("Success", "Your health info has been updated.");
    } catch {
      Alert.alert("Error", "Failed to save health info.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingIndicator color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* --- PERSONAL DETAILS SECTION --- */}
          <Text style={styles.title}>Personal Details</Text>

          <Field
            label="Age"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholder="e.g. 24"
          />

          <TouchableOpacity
            style={styles.pickerField}
            onPress={() => setShowGenderPicker(true)}
          >
            <Text style={styles.label}>Gender</Text>
            <View
              style={[
                styles.input,
                {
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
            >
              <Text style={{ color: gender ? "#fff" : "#666" }}>
                {gender || "Select Gender"}
              </Text>
              <Text style={{ color: "#aaa" }}>▼</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.title}>Body Metrics</Text>

          <Field
            label="Weight (kg)"
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="numeric"
            placeholder="e.g. 70"
          />
          <Field
            label="Height (cm)"
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="numeric"
            placeholder="e.g. 175"
          />
          <ReadOnlyField
            label="BMI"
            value={bmi || "--"}
            textColor={getBmiColor(bmi)}
          />

          <Text style={styles.title}>Fitness Level</Text>
          <TouchableOpacity
            style={styles.pickerField}
            onPress={() => setShowLevelPicker(true)}
          >
            <Text style={styles.label}>Level</Text>
            <View
              style={[
                styles.input,
                {
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
            >
              <Text style={{ color: "#fff" }}>{fitnessLevel || "--"}</Text>
              <Text style={{ color: "#aaa" }}>▼</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.title}>Health Info</Text>
          <Field
            label="Notes"
            value={healthInfoNote}
            onChangeText={setHealthInfoNote}
            keyboardType="default"
            placeholder="Optional health notes"
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            disabled={saving}
            onPress={handleSave}
          >
            {saving ? (
              <LoadingIndicator
                size="small"
                color="#fff"
                style={{ position: "relative", flex: 0 }}
              />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Gender Picker Modal */}
      <Modal visible={showGenderPicker} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            {GENDERS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.levelOption,
                  gender === opt && styles.levelOptionActive,
                ]}
                onPress={() => {
                  setGender(opt);
                  setShowGenderPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.levelOptionText,
                    gender === opt && styles.levelOptionTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowGenderPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Level Picker Modal */}
      <Modal visible={showLevelPicker} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Fitness Level</Text>
            {LEVELS.map((lvl) => (
              <TouchableOpacity
                key={lvl}
                style={[
                  styles.levelOption,
                  fitnessLevel === lvl && styles.levelOptionActive,
                ]}
                onPress={() => {
                  setFitnessLevel(lvl);
                  setShowLevelPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.levelOptionText,
                    fitnessLevel === lvl && styles.levelOptionTextActive,
                  ]}
                >
                  {lvl}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowLevelPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Field = ({
  label,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "numeric";
  placeholder?: string;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={styles.input} {...inputProps} />
  </View>
);

const ReadOnlyField = ({
  label,
  value,
  textColor,
}: {
  label: string;
  value: string;
  textColor?: string;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.input, { justifyContent: "center" }]}>
      <Text style={{ color: textColor || "#fff", fontWeight: "bold" }}>
        {value}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#262135",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    gap: 12,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  field: { gap: 6 },
  label: {
    color: "#aaa",
    fontSize: 14,
  },
  input: {
    backgroundColor: "#1b1630",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#2a2540",
  },
  pickerField: { gap: 6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#1b1630",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  levelOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: "#2a2540",
  },
  levelOptionActive: {
    backgroundColor: "#7C5CFC",
  },
  levelOptionText: {
    color: "#aaa",
    fontSize: 16,
  },
  levelOptionTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  modalCancelButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#aaa",
    fontSize: 14,
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: "#7C5CFC",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default PersonalInformationScreen;
