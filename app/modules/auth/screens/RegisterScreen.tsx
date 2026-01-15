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
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation/AppNavigator";
import { AuthStackParamList } from "../navigation/AuthNavigator";
import { CompositeNavigationProp } from "@react-navigation/native";
import { auth, db } from "../../../../firebaseConfig";
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
import LoadingIndicator from "../../../components/LoadingIndicator";

type RegisterScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AuthStackParamList, "Register">,
  NativeStackNavigationProp<RootStackParamList>
>;

type RegisterScreenProps = {
  navigation: RegisterScreenNavigationProp;
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    // 1. Basic Validation
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    try {
      setIsLoading(true);
      const usersRef = collection(db, "users");

      // 2. Check if Name is already taken (Manual Check)
      const nameQuery = query(usersRef, where("name", "==", name));
      const nameSnapshot = await getDocs(nameQuery);
      if (!nameSnapshot.empty) {
        setIsLoading(false);
        Alert.alert(
          "Name Taken",
          "This name is already in use. Please choose another."
        );
        return;
      }

      // 3. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // 4. Update Firebase Auth Profile
      await updateProfile(user, { displayName: name });

      // 5. Store User Data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email: email.toLowerCase(),
        createdAt: new Date().toISOString(),
      });

      // 6. Success Handling
      Alert.alert("Success", `Registered as ${name}`, [
        {
          text: "OK",
          onPress: () => navigation.replace("OnboardingGender"),
        },
      ]);
    } catch (error: any) {
      // 7. Friendly Error Mapping
      let friendlyMessage = "An unexpected error occurred. Please try again.";

      switch (error.code) {
        case "auth/weak-password":
          friendlyMessage =
            "Your password is too weak. It must be at least 6 characters long.";
          break;
        case "auth/email-already-in-use":
          friendlyMessage =
            "This email is already registered. Try logging in instead.";
          break;
        case "auth/invalid-email":
          friendlyMessage = "The email address format is invalid.";
          break;
        case "auth/network-request-failed":
          friendlyMessage =
            "Network error. Please check your internet connection.";
          break;
        case "auth/too-many-requests":
          friendlyMessage = "Too many attempts. Please try again later.";
          break;
        default:
          // Use the default message or the error's own message if it's not a Firebase code
          friendlyMessage = error.message || friendlyMessage;
      }

      Alert.alert("Registration Error", friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <TouchableOpacity
        onPress={() => navigation.navigate("Auth", { screen: "Welcome" })}
        style={[styles.backButton, { top: insets.top + 10 }]}
        disabled={isLoading}
      >
        <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={styles.container}>
        <Image
          source={require("../../../../assets/iconFitNity.png")}
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
          editable={!isLoading}
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#888"
          editable={!isLoading}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={() => setPasswordVisible(!passwordVisible)}
            style={styles.eyeIcon}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <MaterialCommunityIcons
              name={passwordVisible ? "eye" : "eye-off"}
              size={24}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>

        <View style={styles.loginPromptContainer}>
          <Text style={styles.promptText}>Already have an account?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Auth", { screen: "Login" })}
            disabled={isLoading}
          >
            <Text style={styles.loginText}> Login now</Text>
          </TouchableOpacity>
        </View>
      </View>
      {isLoading && <LoadingIndicator />}
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
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  backButton: {
    position: "absolute",
    left: 10,
    zIndex: 10,
    padding: 8,
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
    color: "#8a84a5",
    fontSize: 14,
  },
  loginText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default RegisterScreen;
