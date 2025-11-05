import React, { useState, useEffect } from "react";
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
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { auth, db, storage } from "../../../../../firebaseConfig";
import { doc, collection, addDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import LoadingIndicator from "../../../../components/LoadingIndicator";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const PhotoButton = ({
  icon,
  text,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.addPhotoButton} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={32} color="#6c5ce7" />
    <Text style={styles.addPhotoText}>{text}</Text>
  </TouchableOpacity>
);

const CreatePostScreen = () => {
  const [postText, setPostText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("User");
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          setUserName(
            userDoc.exists() ? userDoc.data().name || "User" : "User"
          );
        } catch {
          setUserName("User");
        }
      }
    })();
  }, []);

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
          aspect: [1, 1],
          quality: 1,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const removeImage = () => setSelectedImage(null);

  const uploadImage = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = uri.substring(uri.lastIndexOf("/") + 1);
    const storageRef = ref(storage, `posts/${Date.now()}_${filename}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const createPost = async () => {
    setIsPosting(true);
    try {
      let imageUrl = null;
      if (selectedImage) imageUrl = await uploadImage(selectedImage);
      const postData = {
        userId: auth.currentUser?.uid,
        userName,
        text: postText,
        imageUrl,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
      };
      await addDoc(collection(db, "posts"), postData);
      Alert.alert("Success", "Your post has been created successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      alert("Failed to create post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      enableOnAndroid
      extraScrollHeight={24}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity
          style={[
            styles.postButton,
            (!postText && !selectedImage) || isPosting
              ? styles.postButtonDisabled
              : null,
          ]}
          disabled={(!postText && !selectedImage) || isPosting}
          onPress={createPost}
        >
          {isPosting ? (
            <LoadingIndicator size="small" color="#fff" />
          ) : (
            <Text
              style={[
                styles.postButtonText,
                !postText && !selectedImage
                  ? styles.postButtonTextDisabled
                  : null,
              ]}
            >
              Post
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* User Info Section */}
      <View style={styles.userSection}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={24} color="#fff" />
          </View>
          <Text style={styles.userName}>{userName}</Text>
        </View>
      </View>

      {/* Content */}
      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        placeholderTextColor="#8a84a5"
        multiline
        value={postText}
        onChangeText={setPostText}
      />

      {/* Image Preview */}
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
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

      {/* Add Photo Buttons */}
      <PhotoButton
        icon="image-plus"
        text="Add Photo"
        onPress={() => handleImage(false)}
      />
      <PhotoButton
        icon="camera"
        text="Take Photo"
        onPress={() => handleImage(true)}
      />
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#3d3654",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    height: 40,
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6c5ce7",
  },
  postButtonDisabled: {
    backgroundColor: "#3d3654",
  },
  postButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  postButtonTextDisabled: {
    color: "#8a84a5",
  },
  userSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#3d3654",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3d3654",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  contentContainer: {
    padding: 4,
    flexGrow: 1,
  },
  input: {
    color: "#fff",
    fontSize: 16,
    textAlignVertical: "top",
    paddingTop: 10,
    minHeight: 200,
  },
  imagePreviewContainer: {
    marginTop: 16,
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 12,
  },
  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "rgba(108, 92, 231, 0.15)",
    marginTop: 24,
    width: "100%",
  },
  addPhotoText: {
    color: "#6c5ce7",
    marginLeft: 12,
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default CreatePostScreen;
