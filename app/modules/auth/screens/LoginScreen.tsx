import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../../../firebaseConfig";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation/AppNavigator";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AuthStackParamList } from "../navigation/AuthNavigator";
import {
  CompositeNavigationProp,
  CommonActions,
} from "@react-navigation/native";

type LoginScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AuthStackParamList, "Login">,
  NativeStackNavigationProp<RootStackParamList>
>;

type LoginScreenProps = {
  navigation: LoginScreenNavigationProp;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    let loginEmail = email;

    const isEmail = /\S+@\S+\.\S+/.test(email);

    if (!isEmail) {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("name", "==", email));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          Alert.alert("Login Failed", "No user found with that name");
          return;
        }
        const userData = querySnapshot.docs[0].data();
        loginEmail = userData.email;
      } catch (error) {
        Alert.alert("Login Failed", "Error retrieving user information");
        return;
      }
    }

    try {
      await signInWithEmailAndPassword(auth, loginEmail, password);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: "HomeTab" as keyof RootStackParamList,
            },
          ],
        })
      );
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPassword");
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <TouchableOpacity
        onPress={() => navigation.navigate("Welcome")}
        style={[styles.backButton, { top: insets.top }]}
      >
        <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
      </TouchableOpacity>
      <View style={styles.container}>
        <Image
          source={require("../../../../assets/iconFitNity.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Login to FitNity</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
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

        <TouchableOpacity
          onPress={handleForgotPassword}
          style={styles.forgotPassword}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogin} style={styles.loginButton}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.registerButtonText}>Register now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#262135",
  },
  backButton: {
    position: "absolute",
    left: 10,
    zIndex: 10,
    padding: 8,
  },
  container: {
    flex: 1,
    backgroundColor: "#262135",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 30,
    backgroundColor: "#fff",
    borderRadius: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 48,
    borderColor: "#5A556B",
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: "#3C3952",
    color: "#fff",
  },
  passwordContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#5A556B",
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 12,
    backgroundColor: "#3C3952",
    marginBottom: 12,
    height: 48,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  eyeIcon: {
    paddingHorizontal: 8,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#fff",
    fontSize: 14,
  },
  loginButton: {
    width: "100%",
    backgroundColor: "white",
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 40,
  },
  loginButtonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  registerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  registerText: {
    color: "#8a84a5",
    fontSize: 14,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default LoginScreen;
