import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

const HomeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Welcome to FitNity!</Text>
      <Text style={styles.subtitle}>
        Track your fitness journey and stay motivated.
      </Text>
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
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4682B4",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
});

export default HomeScreen;
