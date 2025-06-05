import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Welcome">;
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/iconFitNity.png")}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="FitNity Logo"
      />
      <Text style={styles.title}>Start your Fitness Journal</Text>
      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => navigation.replace("Login")}
      >
        <Text style={styles.loginButtonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.registerButton}
        onPress={() => navigation.replace("Register")}
      >
        <Text style={styles.registerButtonText}>Register</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 75,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: "#494358",
    width: 344.24,
    height: 58.76,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    alignSelf: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  registerButton: {
    backgroundColor: "#fff",
    width: 344.24,
    height: 58.76,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    alignSelf: "center",
  },
  registerButtonText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "bold",
  },
});

export default WelcomeScreen;
