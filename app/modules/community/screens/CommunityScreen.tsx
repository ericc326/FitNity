import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import FeedTab from "./FeedTab";
import ChallengesTab from "./ChallengesTab";

const CommunityScreen = () => {
  const [activeTab, setActiveTab] = useState<"Feed" | "Challenges">("Feed");

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Community</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => setActiveTab("Feed")}>
          <Text style={[styles.tab, activeTab === "Feed" && styles.activeTab]}>
            Feed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab("Challenges")}>
          <Text
            style={[styles.tab, activeTab === "Challenges" && styles.activeTab]}
          >
            Challenges
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {activeTab === "Feed" ? <FeedTab /> : <ChallengesTab />}
      </View>
    </View>
  );
};

export default CommunityScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1c1c2e" },
  header: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 60,
    marginLeft: 20,
  },
  tabContainer: {
    flexDirection: "row",
    marginTop: 20,
    marginHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  tab: {
    marginRight: 20,
    fontSize: 18,
    color: "#aaa",
    paddingBottom: 8,
  },
  activeTab: {
    color: "white",
    borderBottomWidth: 3,
    borderBottomColor: "#fff",
  },
  contentContainer: { flex: 1 },
});
