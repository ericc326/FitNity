import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from '../../../../navigation/AppNavigator';

type FeedTabNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type PostType = {
  id: string;
  user: {
    name: string;
    avatar: string;
    timeAgo: string;
  };
  content: string;
  image?: string | number;
  likes: {
    count: number;
    userNames: string[];
  };
  responses: number;
};

const FeedTab = () => {
  const navigation = useNavigation<FeedTabNavigationProp>();
  const posts: PostType[] = [
    {
      id: "1",
      user: {
        name: "Zepenllin",
        avatar: require("../../../../assets/profile.png"), // Replace with db image
        timeAgo: "9 h",
      },
      content: "Here is my diet for today, stay healthy and fit",
      image: require("../../../../assets/imageNotFound.png"), // Replace with db image
      likes: {
        count: 1900,
        userNames: ["Hugo", "others"],
      },
      responses: 150,
    },
    {
      id: "2",
      user: {
        name: "Daniel",
        avatar: require("../../../../assets/profile.png"), // Replace with your db image
        timeAgo: "2 d",
      },
      content: "Today done the challenge of Burpee",
      image: require("../../../../assets/imageNotFound.png"), // Replace with your db image
      likes: {
        count: 1200,
        userNames: ["Hugo", "others"],
      },
      responses: 120,
    },
  ];

  const renderPost = (post: PostType) => (
    <View key={post.id} style={styles.postContainer}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <Image
            source={
              typeof post.user.avatar === "string"
                ? { uri: post.user.avatar }
                : post.user.avatar
            }
            style={styles.avatar}
          />
          <View>
            <Text style={styles.userName}>{post.user.name}</Text>
            <Text style={styles.timeAgo}>{post.user.timeAgo}</Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.followButton}>
            <Text style={styles.followButtonText}>Follow</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <MaterialCommunityIcons
              name="dots-vertical"
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.postContent}>{post.content}</Text>

      {post.image && (
        <Image
          source={
            typeof post.image === "string" ? { uri: post.image } : post.image
          }
          style={styles.postImage}
        />
      )}

      <View style={styles.postStats}>
        <View style={styles.likeSection}>
          <TouchableOpacity style={styles.likeButton}>
            <MaterialCommunityIcons
              name="heart-outline"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.likeText}>
            Liked by {post.likes.userNames[0]} and others {post.likes.count}
          </Text>
        </View>
        <View style={styles.responseSection}>
          <View style={styles.avatarGroup}>
            {/* Add small avatar circles here */}
          </View>
          <Text style={styles.responseText}>{post.responses} responses</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container}>{posts.map(renderPost)}</ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("CreatePost")}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#262135",
  },
  container: {
    flex: 1,
  },
  postContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  timeAgo: {
    color: "#8a84a5",
    fontSize: 14,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  followButton: {
    backgroundColor: "#4a90e2",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  followButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  moreButton: {
    padding: 4,
  },
  postContent: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 12,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  postStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  likeSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  likeButton: {
    marginRight: 8,
  },
  likeText: {
    color: "#fff",
    fontSize: 14,
  },
  responseSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarGroup: {
    flexDirection: "row",
    marginRight: 8,
  },
  responseText: {
    color: "#8a84a5",
    fontSize: 14,
  },
  addButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4a90e2",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default FeedTab;
