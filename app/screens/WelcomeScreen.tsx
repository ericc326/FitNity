import React from "react";
import { View, Text, StyleSheet, Image, Button } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Welcome">;
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/icon.png")}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="FitNity Logo"
      />
      <Text style={styles.title}>Welcome to FitNity!</Text>
      <Text style={styles.subtitle}>Let's start your fitness journey.</Text>
      <Button
        title="Login"
        onPress={() => navigation.replace("Login")}
        color="#ffffff"
      />
      {/* <Button
        title="Continue"
        onPress={() => navigation.replace('Main', { screen: 'Home' })}
        color="#ffffff"
      /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4682B4",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "white",
    marginBottom: 30,
  },
});

export default WelcomeScreen;
