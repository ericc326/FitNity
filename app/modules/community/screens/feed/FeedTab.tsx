import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FeedStackParamList } from "../../navigation/CommunityNavigator";
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { db, auth, storage } from "../../../../../firebaseConfig";
import LoadingIndicator from "../../../../components/LoadingIndicator";

type FeedTabNavigationProp = NativeStackNavigationProp<
  FeedStackParamList,
  "FeedList"
>;

type PostType = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  likes: number;
  comments: number;
};

const PostImage = ({ imageUrl }: { imageUrl: string }) => {
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <View style={styles.imageContainer}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.postImage}
        onLoadStart={() => setImageLoading(true)}
        onLoad={() => setImageLoading(false)}
        onError={() => setImageLoading(false)}
      />
      {imageLoading && (
        <LoadingIndicator size="large" color="rgba(255, 255, 255, 0.5)" />
      )}
    </View>
  );
};

type LikeState = {
  [postId: string]: {
    isLiked: boolean;
    count: number;
  };
};

const FeedTab = () => {
  const navigation = useNavigation<FeedTabNavigationProp>();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likesState, setLikesState] = useState<LikeState>({});

  const fetchPosts = async () => {
    try {
      const postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(postsQuery);

      const fetchedPosts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PostType[];
      // Initialize likes state for all posts
      const newLikesState: LikeState = {};
      await Promise.all(
        fetchedPosts.map(async (post) => {
          if (auth.currentUser) {
            const likeDocRef = doc(
              db,
              "posts",
              post.id,
              "likes",
              auth.currentUser.uid
            );
            const likeDoc = await getDoc(likeDocRef);
            newLikesState[post.id] = {
              isLiked: likeDoc.exists(),
              count: post.likes || 0,
            };
          }
        })
      );

      setLikesState(newLikesState);
      setPosts(fetchedPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchPosts();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  const handleMorePress = (post: PostType) => {
    Alert.alert(
      "Post Options",
      "Choose an action",
      [
        {
          text: "Edit",
          onPress: () => handleEditPost(post),
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeletePost(post),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeletePost = (post: PostType) => {
    if (!post) return;

    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // First, delete the image if it exists
              if (post.imageUrl) {
                try {
                  // Extract the file path from the URL
                  const imageUrl = new URL(post.imageUrl);
                  const imagePath = decodeURIComponent(
                    imageUrl.pathname.split("/o/")[1]
                  );
                  const imageRef = storageRef(storage, imagePath);

                  await deleteObject(imageRef);
                } catch (imageError) {
                  console.error("Error deleting image:", imageError);
                }
              }

              // Delete subcollections: likes and comments
              const subcollections = ["likes", "comments"];
              for (const sub of subcollections) {
                const subColRef = collection(db, "posts", post.id, sub);
                const subSnap = await getDocs(subColRef);
                const deletePromises = subSnap.docs.map((d) =>
                  deleteDoc(d.ref)
                );
                await Promise.all(deletePromises);
              }

              // Then delete the post document
              await deleteDoc(doc(db, "posts", post.id));

              // Refresh posts after deletion
              fetchPosts();

              // Show success message
              Alert.alert("Success", "Post deleted successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to delete post. Please try again.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleEditPost = (post: PostType) => {
    if (!post) return;
    navigation.navigate("EditPost", { post });
  };

  const toggleLike = async (post: PostType) => {
    if (!auth.currentUser) {
      Alert.alert("Error", "You must be logged in to like posts");
      return;
    }

    try {
      const postRef = doc(db, "posts", post.id);
      const likeDocRef = doc(
        db,
        "posts",
        post.id,
        "likes",
        auth.currentUser.uid
      );
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        console.error("Post not found");
        return;
      }

      const currentLikeState = likesState[post.id]?.isLiked || false;
      const increment_value = currentLikeState ? -1 : 1;

      if (currentLikeState) {
        // Unlike: remove like doc and decrement count
        await deleteDoc(likeDocRef);
      } else {
        // Like: add like doc
        await setDoc(likeDocRef, { likedAt: new Date().toISOString() });
      }

      // Update the likes count in Firestore
      await updateDoc(postRef, {
        likes: increment(increment_value),
      });

      // Update local state
      setLikesState((prev) => ({
        ...prev,
        [post.id]: {
          isLiked: !currentLikeState,
          count: (prev[post.id]?.count || post.likes) + increment_value,
        },
      }));
    } catch (error) {
      console.error("Error toggling like:", error);
      Alert.alert("Error", "Failed to update like. Please try again.");
    }
  };

  const renderPost = ({ item: post }: { item: PostType }) => (
    <View style={styles.postContainer}>
      {/* Header Section */}
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.userName}>{post.userName}</Text>
            <Text style={styles.timeAgo}>{getTimeAgo(post.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          {auth.currentUser && post.userId === auth.currentUser.uid ? (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => handleMorePress(post)}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Content Section */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("PostDetails", {
            post,
            likeState: likesState[post.id],
          })
        }
      >
        <Text style={styles.postContent}>{post.text}</Text>
        {post.imageUrl && <PostImage imageUrl={post.imageUrl} />}
      </TouchableOpacity>

      {/* Stats Section - Separate buttons for like and comment */}
      <View style={styles.postStats}>
        <View style={styles.leftStats}>
          <TouchableOpacity
            style={styles.likeSection}
            onPress={() => toggleLike(post)}
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons
              name={likesState[post.id]?.isLiked ? "heart" : "heart-outline"}
              size={24}
              color={likesState[post.id]?.isLiked ? "#e74c3c" : "#fff"}
            />
            <Text style={styles.likeText}>
              {likesState[post.id]?.count !== undefined
                ? likesState[post.id].count
                : post.likes}{" "}
              likes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.commentSection}
            onPress={() =>
              navigation.navigate("PostDetails", {
                post,
                likeState: likesState[post.id],
              })
            }
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons
              name="comment-outline"
              size={24}
              color="#fff"
              style={styles.commentButton}
            />
            <Text style={styles.responseText}>{post.comments} comments</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.mainContainer, styles.loadingContainer]}>
        <LoadingIndicator size="large" color="#6c5ce7" />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="rgba(255, 255, 255, 0.5)"
          />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />

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
    backgroundColor: "#3d3654",
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  timeAgo: {
    color: "#8a84a5",
    fontSize: 14,
    paddingTop: 4,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
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
    justifyContent: "flex-start",
    alignItems: "center",
  },
  leftStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  likeSection: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  commentSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentButton: {
    marginRight: 8,
  },
  likeButton: {
    marginRight: 8,
  },
  likeText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 8,
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
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
});

export default FeedTab;
