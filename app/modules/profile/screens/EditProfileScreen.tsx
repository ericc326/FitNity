import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { auth, storage, db } from "../../../../firebaseConfig";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { updateProfile, updateEmail } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import LoadingIndicator from "../../../components/LoadingIndicator";

const EditProfileScreen = () => {
  //not completed yet
  const navigation = useNavigation();
  const user = auth.currentUser;
  const [userName, setUserName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [photoUri, setPhotoUri] = useState<string | null>(
    user?.photoURL || null
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // ensure fields reflect current auth user
    const u = auth.currentUser;
    setUserName(u?.displayName || "");
    setEmail(u?.email || "");
    setPhotoUri(u?.photoURL || null);
  }, []);

  const parseStoragePathFromUrl = (url?: string | null) => {
    if (!url) return null;
    try {
      // gs://bucket/path or storage download URL with /o/<encodedPath>
      const oIndex = url.indexOf("/o/");
      if (oIndex !== -1) {
        const afterO = url.substring(oIndex + 3);
        const encodedPath = afterO.split(/[?#]/)[0];
        return decodeURIComponent(encodedPath).replace(/^\/+/, "");
      }
      return null;
    } catch (e) {
      console.warn("parseStoragePathFromUrl failed:", e);
      return null;
    }
  };

  const askPermissions = async () => {
    if (Platform.OS !== "web") {
      const { status: mediaStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaStatus !== "granted") {
        Alert.alert(
          "Permission required",
          "Permission to access media library is required."
        );
        return false;
      }
      const { status: cameraStatus } =
        await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== "granted") {
        Alert.alert(
          "Permission required",
          "Permission to access media library is required."
        );
        return false;
      }
    }
    return true;
  };

  const handleImage = async (fromCamera: boolean) => {
    const permissionStatus = await askPermissions();
    if (!permissionStatus) return;
    try {
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          });

      if (!result.canceled) {
        // new API: assets array
        const uri = result.assets?.[0]?.uri ?? (result as any).uri;
        if (uri) setPhotoUri(uri);
      }
    } catch (e) {
      console.error(e);
      Alert.alert(
        "Error",
        fromCamera ? "Could not take photo." : "Could not pick image."
      );
    }
  };

  const onChangeImagePress = () => {
    Alert.alert("Change Profile Photo", undefined, [
      { text: "Choose from Library", onPress: () => handleImage(false) },
      { text: "Take Photo", onPress: () => handleImage(true) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadImageAsync = async (uri: string, uid: string) => {
    try {
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = uri.substring(uri.lastIndexOf("/") + 1);
      const storageRef = ref(storage, `profiles/${Date.now()}_${filename}`);
      await uploadBytes(storageRef, blob, {
        contentType: blob.type || "image/jpeg",
        customMetadata: { uid },
      });
      return await getDownloadURL(storageRef);
    } catch (e) {
      console.error(e);
      Alert.alert("Upload failed", "Failed to upload profile image.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "You must be signed in to save profile.");
      return;
    }
    setSaving(true);
    try {
      const previousPhotoUrl = currentUser.photoURL ?? null;
      let photoURL = previousPhotoUrl;
      if (photoUri && photoUri !== currentUser.photoURL) {
        const uploadedUrl = await uploadImageAsync(photoUri, currentUser.uid);
        if (uploadedUrl) photoURL = uploadedUrl;
      }

      // update auth profile (name and photoURL)
      try {
        await updateProfile(currentUser, {
          displayName: userName || null, // set auth.displayName from `userName`
          photoURL: photoURL || null,
        });
      } catch (err) {
        console.warn("updateProfile failed", err);
      }

      // update email if changed (need change to used the firebase function) (not completed)
      if (email && email !== currentUser.email) {
        try {
          await updateEmail(currentUser, email);
        } catch (err: any) {
          console.warn("updateEmail failed", err);
          Alert.alert(
            "Email update failed",
            err?.message ||
              "Could not update email. You may need to re-authenticate."
          );
          if (err?.code === "auth/requires-recent-login") {
            Alert.alert(
              "Re-authentication required",
              "Please login again to confirm your identity before changing email."
            );
          } else {
            Alert.alert(
              "Email update failed",
              err?.message || "Could not update email."
            );
          }
        }
      }

      // persist to Firestore users collection (merge)
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(
          userRef,
          {
            name: userName || null,
            email: email || null,
            photoURL: photoURL || null,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("Firestore save failed", err);
      }

      // try to delete previous image (best-effort)
      try {
        if (previousPhotoUrl && previousPhotoUrl !== photoURL) {
          const prevPath = parseStoragePathFromUrl(previousPhotoUrl);
          if (prevPath) {
            // delete via client SDK
            await deleteObject(ref(storage, prevPath));
            console.log("Deleted previous profile image:", prevPath);
          } else {
            console.log(
              "Could not derive storage path for previous photoURL, skip delete"
            );
          }
        }
      } catch (delErr) {
        console.warn(
          "Failed to delete previous profile image (non fatal):",
          delErr
        );
      }

      Alert.alert("Success", "Profile updated successfully.");
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image
            source={
              photoUri
                ? { uri: photoUri }
                : require("../../../assets/profile.png")
            }
            style={styles.profileImage}
          />
          <TouchableOpacity
            style={styles.changeImageButton}
            onPress={onChangeImagePress}
          >
            <MaterialCommunityIcons name="camera" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={userName}
              onChangeText={setUserName}
              placeholder="Enter your name"
              placeholderTextColor="#8a84a5"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#8a84a5"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving || uploading}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

        {(uploading || saving) && <LoadingIndicator style={styles.overlay} />}
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
  imageContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#222",
  },
  changeImageButton: {
    position: "absolute",
    bottom: 0,
    right: "35%",
    backgroundColor: "#4a90e2",
    padding: 8,
    borderRadius: 20,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#3C3952",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    fontSize: 16,
  },
  emailText: {
    color: "#8a84a5",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#4a90e2",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default EditProfileScreen;
