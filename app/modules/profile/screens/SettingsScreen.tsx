import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ensureNotificationPermissions,
  getNotificationPreference,
  setNotificationPreference,
  rescheduleUpcomingReminders,
} from "../../../services/NotificationService";

const SettingsScreen = () => {
  //Pending: add reminder preference (how many minutes before workout)
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      const isEnabled = await getNotificationPreference();
      setPushEnabled(isEnabled);
    };
    loadSettings();
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    setPushEnabled(value);
    if (value) {
      const permissionGranted = await ensureNotificationPermissions();
      await setNotificationPreference(true);
      if (permissionGranted) {
        // re-create all future reminders that were canceled while push was off
        await rescheduleUpcomingReminders();
      }
    } else {
      await setNotificationPreference(false); // this also cancels all pending
      Alert.alert(
        "Notifications Disabled",
        "All pending workout reminders have been canceled."
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Switch
              value={pushEnabled}
              onValueChange={handleToggleNotifications}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Privacy Policy</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#8a84a5"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Terms of Service</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#8a84a5"
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: "#4a90e2",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#3C3952",
  },
  settingLabel: {
    color: "#fff",
    fontSize: 16,
  },
  settingValue: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingValueText: {
    color: "#8a84a5",
    marginRight: 8,
  },
});

export default SettingsScreen;
