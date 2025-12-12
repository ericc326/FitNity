import React, { useState, useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import LoadingIndicator from "./LoadingIndicator";

type UserAvatarProps = {
  userId?: string;
  uri?: string | null;
  size?: number;
  style?: any;
};

const UserAvatar = ({ userId, uri, size = 40, style }: UserAvatarProps) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    // If a URI is passed explicitly (Edit Profile / Profile Screen), use it directly
    if (uri !== undefined) {
      setAvatarUrl(uri);
      return;
    }

    // If userId is provided, LISTEN to the user document in real-time.
    let unsubscribe: () => void;
    if (userId) {
      const userDocRef = doc(db, "users", userId);

      // onSnapshot listens for changes instantly
      unsubscribe = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Safe check: ensure it exists and is a string
            if (data?.photoURL && typeof data.photoURL === "string") {
              setAvatarUrl(data.photoURL);
            } else {
              setAvatarUrl(null);
            }
          } else {
            setAvatarUrl(null);
          }
        },
        (error) => {
          console.log("Avatar listener error:", error);
        }
      );
    }

    // Cleanup listener when component unmounts or userId changes
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId, uri]);

  // Render Image if URL exists
  if (avatarUrl) {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: "#3d3654",
          }}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />
        {imageLoading && (
          <View
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: size / 2, overflow: "hidden" },
            ]}
          >
            <LoadingIndicator size="small" color="#fff" />
          </View>
        )}
      </View>
    );
  }

  // Fallback to Icon
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#3d3654",
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name="account" size={size * 0.6} color="#fff" />
    </View>
  );
};

export default UserAvatar;
