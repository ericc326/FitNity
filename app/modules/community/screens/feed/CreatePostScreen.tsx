import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

const CreatePostScreen = () => {
  const [postText, setPostText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const navigation = useNavigation();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions to upload photos!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
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
              !postText && !selectedImage ? styles.postButtonDisabled : null,
            ]}
            disabled={!postText && !selectedImage}
            onPress={() => {
              // Handle post creation
              navigation.goBack();
            }}
          >
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
          </TouchableOpacity>
        </View>

        {/* User Info Section */}
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={24} color="#fff" />
            </View>
            <Text style={styles.userName}>Your Name</Text>
          </View>
        </View>

        {/* Content */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
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
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.imagePreview}
                />
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

            {/* Add Photo Button */}
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
              <MaterialCommunityIcons
                name="image-plus"
                size={24}
                color="#6c5ce7"
              />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.dismissKeyboardArea} />
            </TouchableWithoutFeedback>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#262135",
  },
  container: {
    flex: 1,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    flexGrow: 1, // This ensures the content container can grow
  },
  input: {
    color: "#fff",
    fontSize: 16,
    textAlignVertical: "top",
    paddingTop: 0,
    minHeight: 200,
  },
  dismissKeyboardArea: {
    flex: 1,
    minHeight: 100,
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
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(108, 92, 231, 0.1)",
    marginTop: 16,
  },
  addPhotoText: {
    color: "#6c5ce7",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default CreatePostScreen;
