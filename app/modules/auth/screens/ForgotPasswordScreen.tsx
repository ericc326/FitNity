import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../../../firebaseConfig";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation/AppNavigator";
import { AuthStackParamList } from "../navigation/AuthNavigator";
import { CompositeNavigationProp } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type ForgotPasswordScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AuthStackParamList, "ForgotPassword">,
  NativeStackNavigationProp<RootStackParamList>
>;

type ForgotPasswordScreenProps = {
  navigation: ForgotPasswordScreenNavigationProp;
};

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  navigation,
}) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Check if email exists in Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert(
          "Error",
          "This email is not registered. Please enter a registered email."
        );
        return;
      }

      // Step 2: If email is found, send reset email
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Success",
        "Password reset email sent! Please check your inbox."
      );
      navigation.navigate("Auth", { screen: "Login" });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <TouchableOpacity
        onPress={() => navigation.navigate("Auth", { screen: "Login" })}
        style={[styles.backButton, { top: insets.top + 10 }]}
      >
        <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.instruction}>
          Enter your email address below and we'll send you a link to reset your
          password.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.resetButton, loading && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={loading}
        >
          <Text style={styles.resetButtonText}>
            {loading ? "Sending..." : "Send Reset Email"}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#262135",
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    left: 10,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  instruction: {
    fontSize: 16,
    color: "#aaa",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    height: 48,
    borderColor: "#5A556B",
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#3C3952",
    color: "#fff",
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: "white",
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 20,
  },
  resetButtonText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: "#999",
  },
});

export default ForgotPasswordScreen;
