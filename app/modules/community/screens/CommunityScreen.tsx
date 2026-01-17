import { View, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CommunityNavigator from "../navigation/CommunityNavigator";

const CommunityScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerWrapper}>
        <Text style={styles.header}>Community</Text>
      </View>
      <CommunityNavigator />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  headerWrapper: {
    alignItems: "center",
    marginBottom: 12,
  },
  header: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
});

export default CommunityScreen;
