import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "OnboardingGender">;

const OnboardingGenderScreen = ({ navigation }: Props) => {
  const handleSelect = (gender: string) => {
    navigation.navigate("OnboardingBody", { gender });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>Tell us about yourself</Text>
        <Text style={styles.headerSubtitle}>
          Please choose your gender or preferred identity. We value your
          uniqueness!
        </Text>
      </View>
      <View style={styles.genderRow}>
        <TouchableOpacity
          style={styles.genderOption}
          onPress={() => handleSelect("Male")}
        >
          <View style={styles.avatarCircle}>
            <Image
              source={require("../../../assets/maleProfile.png")}
              style={styles.avatarImg}
            />
          </View>
          <Text style={styles.genderLabel}>Male</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.genderOption}
          onPress={() => handleSelect("Female")}
        >
          <View style={styles.avatarCircle}>
            <Image
              source={require("../../../assets/femaleProfile.png")}
              style={styles.avatarImg}
            />
          </View>
          <Text style={styles.genderLabel}>Female</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn} disabled>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#bbb" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => {}}>
          <MaterialCommunityIcons name="chevron-right" size={32} color="#bbb" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFDFD", justifyContent: "center" },
  headerBox: {
    margin: 24,
    borderRadius: 8,
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
  genderRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginVertical: 32,
  },
  genderOption: {
    alignItems: "center",
  },
  avatarCircle: {
    backgroundColor: "#cbe2f7",
    borderRadius: 60,
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarImg: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },
  genderLabel: {
    fontSize: 20,
    fontWeight: "600",
    color: "#262135",
    marginTop: 4,
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
});

export default OnboardingGenderScreen;
