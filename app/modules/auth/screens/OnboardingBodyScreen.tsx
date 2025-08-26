import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "OnboardingBody">;

const OnboardingBodyScreen: React.FC<Props> = ({ navigation, route }) => {
  const { gender } = route.params;
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const handleNext = () => {
    if (weight && height) {
      navigation.navigate("OnboardingHealth", { gender, weight, height });
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBox}>
          <Text style={styles.headerTitle}>Your Body Info</Text>
          <Text style={styles.headerSubtitle}>
            Please enter your body weight and height.
          </Text>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g. 70"
            placeholderTextColor="#aaa"
          />
          <Text style={styles.inputLabel}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={height}
            onChangeText={setHeight}
            placeholder="e.g. 175"
            placeholderTextColor="#aaa"
          />
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
            disabled={!weight || !height}
          >
            <Text
              style={[
                styles.navBtnText,
                (!weight || !height) && { color: "#bbb" },
              ]}
            >
              {">"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", justifyContent: "center" },
  headerBox: {
    padding: 16,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#262135",
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9B9B9B",
    textAlign: "center",
    paddingTop: 15,
    paddingRight: 50,
    paddingBottom: 13,
    paddingLeft: 50,
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

export default OnboardingBodyScreen;
