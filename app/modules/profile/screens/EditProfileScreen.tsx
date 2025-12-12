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
  AlertButton,
  Modal,
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
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  updateProfile,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { useNavigation, CommonActions } from "@react-navigation/native";
import LoadingIndicator from "../../../components/LoadingIndicator";
import UserAvatar from "../../../components/UserAvatar";

interface PasswordPromptProps {
  isVisible: boolean;
  onConfirm: (password: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const PasswordPromptModal: React.FC<PasswordPromptProps> = ({
  isVisible,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  const [password, setPassword] = useState("");

  const handleConfirm = () => {
    if (password) {
      onConfirm(password);
      setPassword(""); // Clear field after attempt
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <Text style={modalStyles.title}>Security Check</Text>
          <Text style={modalStyles.message}>
            Please enter your password to confirm the email change:
          </Text>
          <TextInput
            style={modalStyles.input}
            placeholder="Password"
            placeholderTextColor="#8a84a5"
            secureTextEntry={true}
            value={password}
            onChangeText={setPassword}
            autoFocus={true}
            editable={!isLoading}
          />
          <View style={modalStyles.buttonContainer}>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.cancelButton]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={modalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.confirmButton]}
              onPress={handleConfirm}
              disabled={isLoading || !password}
            >
              <Text style={modalStyles.confirmButtonText}>
                {isLoading ? "Confirming..." : "Confirm"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "85%",
    backgroundColor: "#3C3952",
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 15,
  },
  input: {
    backgroundColor: "#262135",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  confirmButton: {
    backgroundColor: "#4a90e2",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "transparent",
  },
  cancelButtonText: {
    color: "#ccc",
  },
});

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const user = auth.currentUser;
  const [userName, setUserName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [photoUri, setPhotoUri] = useState<string | null>(
    user?.photoURL || null
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showReAuthModal, setShowReAuthModal] = useState(false);
  const [reAuthPayload, setReAuthPayload] = useState<any>(null);

  const initialPhotoRef = React.useRef<string | null>(null);

  const finalizeSave = async (
    currentUser: any,
    userName: string,
    email: string,
    photoURL: string | null,
    previousPhotoUrl: string | null,
    parsePath: (url?: string | null) => string | null
  ) => {
    // Persist to Firestore users collection (merge)
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

    // Try to delete previous image (best-effort)
    try {
      if (previousPhotoUrl && photoURL !== previousPhotoUrl) {
        const prevPath = parsePath(previousPhotoUrl);
        const newPath = parsePath(photoURL);
        if (prevPath && prevPath !== newPath) {
          await deleteObject(ref(storage, prevPath));
          console.log("Deleted previous profile image:", prevPath);
        }
      }
    } catch (delErr) {
      console.warn(
        "Failed to delete previous profile image (non fatal):",
        delErr
      );
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      const u = auth.currentUser;
      if (u) {
        // Try to refresh Auth cache
        try {
          await u.reload();
        } catch (e) {
          console.log("Failed to reload user auth", e);
        }

        // Fetch the latest data from Firestore (The Source of Truth)
        try {
          const userDocRef = doc(db, "users", u.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data();

            // Use Firestore data first, fallback to Auth
            setUserName(data.name || u.displayName || "");

            // Checking strictly for null to handle removal correctly
            let currentUrl = null;
            if (data.photoURL !== null) {
              currentUrl = data.photoURL || u.photoURL || null;
            }
            setPhotoUri(currentUrl);

            if (!initialPhotoRef.current) {
              initialPhotoRef.current = currentUrl;
            }
          } else {
            // Fallback if no Firestore doc exists yet
            setUserName(u.displayName || "");
            setPhotoUri(u.photoURL || null);

            if (!initialPhotoRef.current)
              initialPhotoRef.current = u.photoURL || null;
          }
        } catch (e) {
          console.error("Failed to load user from Firestore", e);
        }
      }
    };

    loadUserData();
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

  const handleRemovePhoto = () => {
    setPhotoUri(null);
  };

  const onChangeImagePress = () => {
    const options: AlertButton[] = [
      { text: "Choose from Library", onPress: () => handleImage(false) },
      { text: "Take Photo", onPress: () => handleImage(true) },
    ];

    // Only show "Remove Photo" if there is currently a photo
    if (photoUri) {
      options.push({
        text: "Remove Photo",
        style: "destructive",
        onPress: handleRemovePhoto,
      });
    }

    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Change Profile Photo", undefined, options);
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

  const handleReAuth = async (password: string) => {
    setShowReAuthModal(false);
    setSaving(true);

    if (!reAuthPayload) {
      setSaving(false);
      return;
    }

    const { currentUser, email, photoURL, userName, previousPhotoUrl } =
      reAuthPayload;

    try {
      // Re-authentication
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        password
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Send verification email
      await verifyBeforeUpdateEmail(currentUser, email);

      // Update Firestore/Delete Old Image
      await finalizeSave(
        currentUser,
        userName,
        email,
        photoURL,
        previousPhotoUrl,
        parseStoragePathFromUrl
      );

      // Show success and force full logout/reset
      Alert.alert(
        "Success",
        `Verification email sent to ${email}. Please verify it, then sign in again.`,
        [
          {
            text: "OK",
            onPress: async () => {
              await auth.signOut().catch(() => null);
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "Auth" }],
                })
              );
            },
          },
        ]
      );
    } catch (reAuthErr: any) {
      console.error("Re-authentication or email update failed:", reAuthErr);
      Alert.alert(
        "Error",
        "Incorrect password or re-authentication failed. Please try again."
      );
      // If it fails, allow retry
      setShowReAuthModal(true);
    } finally {
      setSaving(false);
      setReAuthPayload(null);
    }
  };

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "You must be signed in to save profile.");
      return;
    }
    setSaving(true);

    // Flag to track if the email change flow was handled by the prompt
    let emailChangeHandled = false;

    try {
      const previousPhotoUrl = initialPhotoRef.current;
      let photoURL = previousPhotoUrl;
      // User selected a NEW photo
      if (photoUri && photoUri !== currentUser.photoURL) {
        const uploadedUrl = await uploadImageAsync(photoUri, currentUser.uid);
        if (uploadedUrl) photoURL = uploadedUrl;
      }
      // User removed the photo
      else if (!photoUri && previousPhotoUrl) {
        photoURL = null;
      }

      // update auth profile (name and photoURL)
      try {
        await updateProfile(currentUser, {
          displayName: userName || null, // set auth.displayName from `userName`
          photoURL: photoURL || null,
        });

        await currentUser.reload();
      } catch (err) {
        console.warn("updateProfile failed", err);
      }

      // update email if changed (With Re-authentication handling)
      if (email && email !== currentUser.email) {
        try {
          await verifyBeforeUpdateEmail(currentUser, email);

          // Force the token to refresh NOW, ensuring the next screen has a fresh session.
          await currentUser.getIdToken(true);

          // If successful here (no re-auth needed), finalize and exit
          await finalizeSave(
            currentUser,
            userName,
            email,
            photoURL,
            previousPhotoUrl,
            parseStoragePathFromUrl
          );

          Alert.alert(
            "Verification Sent",
            `We sent a verification email to ${email}. Please verify it, then sign in again.`,
            [
              {
                text: "OK",
                onPress: async () => {
                  await auth.signOut().catch(() => null);
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: "Auth" }],
                    })
                  );
                },
              },
            ],
            { cancelable: false }
          );
          return;
        } catch (err: any) {
          // Check for re-authentication requirement
          if (err.code === "auth/requires-recent-login") {
            emailChangeHandled = true; // Mark as handled by prompt
            setSaving(false); // Hide initial loader

            // Set payload and SHOW MODAL (Cross-Platform)
            setReAuthPayload({
              currentUser,
              email,
              photoURL,
              userName,
              previousPhotoUrl,
            });
            setShowReAuthModal(true);

            return; // Stop execution here, waiting for modal confirmation
          } else {
            // Handle other errors (e.g., invalid email format)
            Alert.alert(
              "Update Failed",
              err?.message || "Could not update email."
            );
            setSaving(false);
            return;
          }
        }
      }

      //When email was not changed
      if (!emailChangeHandled) {
        await finalizeSave(
          currentUser,
          userName,
          email,
          photoURL,
          previousPhotoUrl,
          parseStoragePathFromUrl
        );

        Alert.alert("Success", "Profile updated successfully.");
        navigation.goBack();
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to save profile.");
    } finally {
      if (!emailChangeHandled) {
        setSaving(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <UserAvatar uri={photoUri} size={120} />
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

        <PasswordPromptModal
          isVisible={showReAuthModal}
          onConfirm={handleReAuth}
          onCancel={() => {
            setShowReAuthModal(false);
            setSaving(false);
          }}
          isLoading={saving}
        />
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
