import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { auth, db } from "../../firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Register">;

const RegisterScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false); // added state

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Please fill in all fields");
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    try {
      const usersRef = collection(db, "users");

      const emailQuery = query(
        usersRef,
        where("email", "==", email.toLowerCase())
      );
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        Alert.alert(
          "Email Already Registered",
          "Please use a different email."
        );
        return;
      }

      const nameQuery = query(usersRef, where("name", "==", name));
      const nameSnapshot = await getDocs(nameQuery);
      if (!nameSnapshot.empty) {
        Alert.alert("Name Already Taken", "Please choose a different name.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email: email.toLowerCase(),
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Success", `Registered as ${name}`);
      navigation.navigate("Welcome");
    } catch (error: any) {
      console.error("Registration error:", error);
      Alert.alert(
        "Registration Error",
        error.message || "Something went wrong"
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, { top: insets.top || 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Welcome")}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <Image
          source={require("../../assets/iconFitNity.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Hello! Register to get started</Text>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#888"
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#888"
        />

        {/* Password input with show/hide toggle */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => setPasswordVisible(!passwordVisible)}
            style={styles.eyeIcon}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={passwordVisible ? "eye" : "eye-off"}
              size={24}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>

        <View style={styles.loginPromptContainer}>
          <Text style={styles.promptText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginText}> Login now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#262135",
  },
  header: {
    position: "absolute",
    left: 20,
    zIndex: 10, // make sure it's above content
  },
  backButton: {
    alignSelf: "flex-start",
  },
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 30,
    backgroundColor: "#fff",
    borderRadius: 50,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 24,
    textAlign: "left",
  },
  input: {
    backgroundColor: "#3C3952",
    borderColor: "#5A556B",
    borderWidth: 1,
    padding: 12,
    borderRadius: 28,
    marginBottom: 16,
    color: "#fff",
  },
  // Password container holds input + icon horizontally
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3C3952",
    borderColor: "#5A556B",
    borderWidth: 1,
    borderRadius: 28,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    color: "#fff",
  },
  eyeIcon: {
    paddingLeft: 8,
  },
  button: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 28,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginPromptContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  promptText: {
    color: "#fff",
    fontSize: 14,
  },
  loginText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "bold",
  },
});
