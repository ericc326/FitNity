import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import {
  ensureNotificationPermissions,
  getNotificationPreference,
  setNotificationPreference,
  rescheduleUpcomingReminders,
  getReminderOffsetMinutes,
  setReminderOffsetMinutes,
} from "../../../services/NotificationService";

const SettingsScreen = () => {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [reminderOffsetMin, setReminderOffsetMinState] = useState(5);
  const [pickerValue, setPickerValue] = useState(5);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const isEnabled = await getNotificationPreference();
      setPushEnabled(isEnabled);
      const offset = await getReminderOffsetMinutes();
      setReminderOffsetMinState(offset);
      setPickerValue(offset); // Initialize picker value
    };
    loadSettings();
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    setPushEnabled(value);
    if (value) {
      const permissionGranted = await ensureNotificationPermissions();
      await setNotificationPreference(true);
      if (permissionGranted) {
        setLoading(true);
        // re-create all future reminders that were canceled while push was off
        await rescheduleUpcomingReminders();
        setLoading(false);
      }
    } else {
      await setNotificationPreference(false); // this also cancels all pending
      Alert.alert(
        "Notifications Disabled",
        "All pending workout reminders have been canceled."
      );
    }
  };

  const openTimeModal = () => {
    setPickerValue(reminderOffsetMin); // Sync picker with current saved value
    setShowTimeModal(true);
  };

  const handleSaveTime = async () => {
    setShowTimeModal(false);

    if (pickerValue !== reminderOffsetMin) {
      setReminderOffsetMinState(pickerValue);
      await setReminderOffsetMinutes(pickerValue);

      if (pushEnabled) {
        setLoading(true);
        await rescheduleUpcomingReminders();
        setLoading(false);
        Alert.alert(
          "Updated",
          `Reminders set to ${pickerValue} minutes before workout.`
        );
      }
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

          {pushEnabled && (
            <TouchableOpacity
              style={styles.settingItem}
              onPress={openTimeModal}
              disabled={loading}
            >
              <Text style={styles.settingLabel}>Reminder Timing</Text>
              <View style={styles.settingValue}>
                <Text style={styles.settingValueText}>
                  {loading ? "Updating..." : `${reminderOffsetMin} min before`}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#8a84a5"
                />
              </View>
            </TouchableOpacity>
          )}
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

      <Modal visible={showTimeModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTimeModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Remind me before</Text>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={pickerValue}
                onValueChange={(itemValue) => setPickerValue(itemValue)}
                style={{ width: "100%", height: 200 }} // Height required for iOS wheel
                itemStyle={{ color: "#fff", fontSize: 20 }} // iOS item style
                dropdownIconColor="#fff" // Android dropdown icon
                mode="dialog" // Android dialog mode
              >
                {/* Generate 1 to 60 minutes */}
                {Array.from({ length: 60 }, (_, i) => i + 1).map((val) => (
                  <Picker.Item
                    key={val}
                    label={`${val} min`}
                    value={val}
                    color="#fff" // Android text color (sometimes overridden by theme)
                    style={{ backgroundColor: "#2b2435", color: "#fff" }} // Extra safety for Android
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowTimeModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveTime}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#2b2435",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#3C3952",
    alignItems: "center",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  pickerContainer: {
    width: "100%",
    height: 200,
    justifyContent: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  saveButton: {
    backgroundColor: "#7b68ee",
  },
  cancelText: {
    color: "#ccc",
    fontWeight: "600",
    fontSize: 16,
  },
  saveText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default SettingsScreen;
