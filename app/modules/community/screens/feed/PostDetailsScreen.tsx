import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FeedStackParamList } from "../../navigation/CommunityNavigator";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../../../../../firebaseConfig";
import LoadingIndicator from "../../../../components/LoadingIndicator";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

type Props = NativeStackScreenProps<FeedStackParamList, "PostDetails">;

type CommentType = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
};

type LikeState = {
  isLiked: boolean;
  count: number;
};

const PostDetailsScreen = ({ route, navigation }: Props) => {
  const { post } = route.params;
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<CommentType[]>([]);
  const [likeState, setLikeState] = useState<LikeState>({
    isLiked: false,
    count: post.likes || 0,
  });
  const [loading, setLoading] = useState(true); //for comments loading
  const [imageLoading, setImageLoading] = useState(true); // for post image loading
  const [refreshing, setRefreshing] = useState(false); // for pull-to-refresh

  useEffect(() => {
    fetchComments();
    checkIfLiked();
  }, [post.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Fetch latest post data
    const postDoc = await getDoc(doc(db, "posts", post.id));
    if (postDoc.exists()) {
      // Update like count from Firestore
      setLikeState((prev) => ({
        ...prev,
        count: postDoc.data().likes || 0,
      }));
    }
    // Fetch latest comments
    await fetchComments();
    setRefreshing(false);
  };

  const checkIfLiked = async () => {
    if (!auth.currentUser) return;
    const likeDocRef = doc(db, "posts", post.id, "likes", auth.currentUser.uid);
    const likeDoc = await getDoc(likeDocRef);
    setLikeState((prev) => ({
      ...prev,
      isLiked: likeDoc.exists(),
    }));
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const commentsRef = collection(db, `posts/${post.id}/comments`);
      const commentsQuery = query(commentsRef, orderBy("createdAt", "desc"));

      const querySnapshot = await getDocs(commentsQuery);
      const fetchedComments = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as CommentType[];

      setComments(fetchedComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      Alert.alert("Error", "Unable to load comments. Please try again later.", [
        { text: "OK" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleComment = async () => {
    if (!comment.trim() || !auth.currentUser) return;

    try {
      const commentData = {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || "Anonymous",
        text: comment.trim(),
        createdAt: new Date().toISOString(),
      };

      const commentsRef = collection(db, `posts/${post.id}/comments`);
      await addDoc(commentsRef, commentData);

      const postRef = doc(db, "posts", post.id);
      await updateDoc(postRef, {
        comments: increment(1),
      });

      setComment("");
      fetchComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Unable to post comment. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!auth.currentUser) return;

    try {
      await deleteDoc(doc(db, `posts/${post.id}/comments/${commentId}`));

      const postRef = doc(db, "posts", post.id);
      await updateDoc(postRef, {
        comments: increment(-1),
      });

      fetchComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      Alert.alert("Error", "Unable to delete comment. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const toggleLike = async () => {
    if (!auth.currentUser) {
      Alert.alert("Error", "You must be logged in to like posts");
      return;
    }

    try {
      const likeDocRef = doc(
        db,
        "posts",
        post.id,
        "likes",
        auth.currentUser.uid
      );
      const postRef = doc(db, "posts", post.id);

      if (likeState.isLiked) {
        await deleteDoc(likeDocRef);
        await updateDoc(postRef, { likes: increment(-1) });
        setLikeState((prev) => ({
          ...prev,
          isLiked: false,
          count: prev.count - 1,
        }));
      } else {
        await setDoc(likeDocRef, { likedAt: new Date().toISOString() });
        await updateDoc(postRef, { likes: increment(1) });
        setLikeState((prev) => ({
          ...prev,
          isLiked: true,
          count: prev.count + 1,
        }));
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      Alert.alert("Error", "Failed to update like. Please try again.");
    }
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

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        enableOnAndroid
        extraScrollHeight={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="rgba(255, 255, 255, 0.5)"
          />
        }
      >
        {/* Post Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Post Content */}
        <View style={styles.postContainer}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.userName}>{post.userName}</Text>
              <Text style={styles.timeAgo}>{getTimeAgo(post.createdAt)}</Text>
            </View>
          </View>

          <Text style={styles.postContent}>{post.text}</Text>

          {post.imageUrl && (
            <View
              style={{
                position: "relative",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={{ uri: post.imageUrl }}
                style={styles.postImage}
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
              {imageLoading && (
                <LoadingIndicator
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                />
              )}
            </View>
          )}

          {/* Like and Comment Stats */}
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem} onPress={toggleLike}>
              <MaterialCommunityIcons
                name={likeState.isLiked ? "heart" : "heart-outline"}
                size={24}
                color={likeState.isLiked ? "#e74c3c" : "#fff"}
              />
              <Text style={styles.statText}>{likeState.count} likes</Text>
            </TouchableOpacity>
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="comment-outline"
                size={24}
                color="#fff"
              />
              <Text style={styles.statText}>{comments.length} comments</Text>
            </View>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeader}>Comments</Text>
          {loading ? (
            <LoadingIndicator />
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  <MaterialCommunityIcons
                    name="account"
                    size={20}
                    color="#fff"
                  />
                </View>
                <View style={styles.commentContent}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={styles.commentUserName}>
                      {comment.userName}
                    </Text>
                    {comment.userId === auth.currentUser?.uid && (
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(comment.id)}
                      >
                        <MaterialCommunityIcons
                          name="delete"
                          size={18}
                          color="#e74c3c"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentText}>{comment.text}</Text>
                  <Text style={styles.commentTime}>
                    {getTimeAgo(comment.createdAt)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor="#8a84a5"
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleComment}
            disabled={!comment.trim()}
          >
            <MaterialCommunityIcons
              name="send"
              size={24}
              color={comment.trim() ? "#4a90e2" : "#8a84a5"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  postContainer: {
    padding: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
  timeAgo: {
    color: "#8a84a5",
    fontSize: 14,
  },
  postContent: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 24,
  },
  postImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 14,
  },
  commentsSection: {
    padding: 16,
  },
  commentsHeader: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3d3654",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
    backgroundColor: "#3d3654",
    padding: 12,
    borderRadius: 12,
  },
  commentUserName: {
    color: "#fff",
    fontWeight: "600",
    marginBottom: 4,
  },
  commentText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  commentTime: {
    color: "#8a84a5",
    fontSize: 12,
    marginTop: 4,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#3d3654",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: "#fff",
    marginRight: 12,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
});

export default PostDetailsScreen;
