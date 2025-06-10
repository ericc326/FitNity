import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation/AppNavigator";
import { AuthStackParamList } from "../navigation/AuthNavigator";
import {
  CompositeNavigationProp,
  CommonActions,
} from "@react-navigation/native";
import { auth } from "../../../../firebaseConfig";
import { SafeAreaView } from "react-native-safe-area-context";

type SplashScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AuthStackParamList, "Splash">,
  NativeStackNavigationProp<RootStackParamList>
>;

type SplashScreenProps = {
  navigation: SplashScreenNavigationProp;
};

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const user = auth.currentUser;

        if (user) {
          // User is logged in, navigate to HomeTab
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "HomeTab" as keyof RootStackParamList }],
            })
          );
        } else {
          navigation.replace("Welcome");
        }
      } catch (error) {
        navigation.replace("Welcome");
      }
    };

    checkAuthState();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <Image
          source={require("../../../../assets/iconFitNity.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="FitNity Logo"
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>FitNity</Text>
          <Text style={styles.subtitle}>Everybody can train</Text>
        </View>
        <ActivityIndicator size="large" color="#fff" style={styles.loader} />
      </View>
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
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    backgroundColor: "#fff",
    borderRadius: 60,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: "#8a84a5",
    letterSpacing: 0.5,
  },
  loader: {
    marginTop: 40,
  },
});

export default SplashScreen;
