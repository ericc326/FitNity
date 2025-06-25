import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FeedStackParamList } from "../../navigation/CommunityNavigator";
import { doc, updateDoc } from "firebase/firestore";
import {
  ref as storageRef,
  deleteObject,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "../../../../../firebaseConfig";
import * as ImagePicker from "expo-image-picker";
import LoadingIndicator from "../../../../components/LoadingIndicator";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

type Props = NativeStackScreenProps<FeedStackParamList, "EditPost">;

const EditPostScreen: React.FC<Props> = ({ route, navigation }) => {
  const { post } = route.params;
  const [postText, setPostText] = useState(post.text);
  const [selectedImage, setSelectedImage] = useState(post.imageUrl || null);
  const [imageLoading, setImageLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const uploadImage = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = uri.substring(uri.lastIndexOf("/") + 1);
    const storageReference = storageRef(
      storage,
      `posts/${Date.now()}_${filename}`
    );
    await uploadBytes(storageReference, blob);
    return await getDownloadURL(storageReference);
  };

  const handleImage = async (fromCamera: boolean) => {
    let status;
    if (fromCamera) {
      status = (await ImagePicker.requestCameraPermissionsAsync()).status;
    } else {
      status = (await ImagePicker.requestMediaLibraryPermissionsAsync()).status;
    }
    if (status !== "granted") {
      alert(
        `Sorry, we need ${fromCamera ? "camera" : "media library"} permissions!`
      );
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: "images",
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeImage = () => setSelectedImage(null);

  const handleSave = async () => {
    if (!isChanged) {
      Alert.alert("No changes", "You haven't changed anything to save.");
      return;
    }
    setIsSaving(true);
    try {
      let imageUrl = post.imageUrl; // default to old image

      // If selectedImage is a new local file (not the old URL), upload it
      if (
        selectedImage &&
        selectedImage !== post.imageUrl &&
        !selectedImage.startsWith("http")
      ) {
        // Delete old image if it exists
        if (post.imageUrl && post.imageUrl.includes("/o/")) {
          try {
            const pathWithParams = post.imageUrl.split("/o/")[1];
            const oldImagePath = decodeURIComponent(
              pathWithParams.split("?")[0]
            );
            const oldImageRef = storageRef(storage, oldImagePath);
            await deleteObject(oldImageRef);
          } catch (err) {
            console.warn("Failed to delete old image:", err);
          }
        }
        // Upload new image
        imageUrl = await uploadImage(selectedImage);
      }

      // If image was removed
      if (!selectedImage && post.imageUrl) {
        // Delete old image if it exists
        if (post.imageUrl.includes("/o/")) {
          try {
            const pathWithParams = post.imageUrl.split("/o/")[1];
            const oldImagePath = decodeURIComponent(
              pathWithParams.split("?")[0]
            );
            const oldImageRef = storageRef(storage, oldImagePath);
            await deleteObject(oldImageRef);
          } catch (err) {
            console.warn("Failed to delete old image:", err);
          }
        }
        imageUrl = null;
      }

      await updateDoc(doc(db, "posts", post.id), {
        text: postText,
        imageUrl,
      });
      Alert.alert("Success", "Post updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to update post. Please try again.");
    }
    setIsSaving(false);
  };

  const isChanged =
    postText.trim() !== post.text.trim() ||
    selectedImage !== (post.imageUrl || null);

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      enableOnAndroid
      keyboardShouldPersistTaps="handled"
      extraScrollHeight={100}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Edit Post</Text>
      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        placeholderTextColor="#8a84a5"
        multiline
        value={postText}
        onChangeText={setPostText}
      />
      {selectedImage && (
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: selectedImage }}
            style={styles.imagePreview}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
          />
          {imageLoading && (
            <LoadingIndicator size="large" color="rgba(255, 255, 255, 0.5)" />
          )}
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={removeImage}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={styles.photoButton}
        onPress={() => handleImage(false)}
      >
        <MaterialCommunityIcons name="image-edit" size={28} color="#6c5ce7" />
        <Text style={styles.photoButtonText}>Change Photo (Album)</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.photoButton}
        onPress={() => handleImage(true)}
      >
        <MaterialCommunityIcons name="camera" size={28} color="#6c5ce7" />
        <Text style={styles.photoButtonText}>Change Photo (Camera)</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.saveButton,
          !isChanged || isSaving ? styles.saveButtonDisabled : null,
        ]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <LoadingIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save</Text>
        )}
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#262135" },
  content: { padding: 20, flexGrow: 1, justifyContent: "flex-start" },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  input: {
    color: "#fff",
    fontSize: 16,
    backgroundColor: "#332c4a",
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    marginBottom: 16,
    textAlignVertical: "top",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 20,
    padding: 6,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(108, 92, 231, 0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  photoButtonText: {
    color: "#6c5ce7",
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#6c5ce7",
    borderRadius: 20,
    paddingVertical: 12,
    height: 48,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#3d3654",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
});

export default EditPostScreen;
