import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChallengesTab from "../screens/challenges/ChallengesTab";
import FeedTab from "../screens/feed/FeedTab";
import CreatePostScreen from "../screens/feed/CreatePostScreen";
import PostDetailsScreen from "../screens/feed/PostDetailsScreen";
import EditPostScreen from "../screens/feed/EditPostScreen";
import ChallengeDetailsScreen from "../screens/challenges/ChallengeDetailsScreen";
import CreateChallengeScreen from "../screens/challenges/CreateChallengeScreen";
import EditChallengeScreen from "../screens/challenges/EditChallengeScreen";

// Type definitions for navigation
export type CommunityTabParamList = {
  ChallengesTab: undefined;
  FeedTab: undefined;
};

export type FeedStackParamList = {
  FeedList: undefined;
  PostDetails: {
    post: any;
    likeState?: {
      isLiked: boolean;
      count: number;
    };
  };
  CreatePost: undefined;
  EditPost: { post: any };
};

export type ChallengesStackParamList = {
  ChallengesList: undefined;
  ChallengeDetails: { challenge: any };
  CreateChallenge: undefined;
  EditChallenge: { challenge: any };
};

const Tab = createMaterialTopTabNavigator<CommunityTabParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const ChallengesStack = createNativeStackNavigator<ChallengesStackParamList>();

// Feed Stack Navigator
const FeedNavigator = () => {
  return (
    <FeedStack.Navigator screenOptions={{ headerShown: false }}>
      <FeedStack.Screen name="FeedList" component={FeedTab} />
      <FeedStack.Screen name="CreatePost" component={CreatePostScreen} />
      <FeedStack.Screen name="PostDetails" component={PostDetailsScreen} />
      <FeedStack.Screen name="EditPost" component={EditPostScreen} />
    </FeedStack.Navigator>
  );
};

// Challenges Stack Navigator
const ChallengesNavigator = () => {
  return (
    <ChallengesStack.Navigator screenOptions={{ headerShown: false }}>
      <ChallengesStack.Screen name="ChallengesList" component={ChallengesTab} />
      <ChallengesStack.Screen
        name="ChallengeDetails"
        component={ChallengeDetailsScreen}
      />
      <ChallengesStack.Screen
        name="CreateChallenge"
        component={CreateChallengeScreen}
      />
      <ChallengesStack.Screen
        name="EditChallenge"
        component={EditChallengeScreen}
      />
    </ChallengesStack.Navigator>
  );
};

// Main Community Tab Navigator
const CommunityNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#262135",
        },
        tabBarIndicatorStyle: {
          backgroundColor: "#4a90e2",
        },
        tabBarActiveTintColor: "white",
        tabBarInactiveTintColor: "#5A556B",
        tabBarLabelStyle: {
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedNavigator}
        options={{ tabBarLabel: "Feed" }}
      />
      <Tab.Screen
        name="ChallengesTab"
        component={ChallengesNavigator}
        options={{ tabBarLabel: "Challenges" }}
      />
    </Tab.Navigator>
  );
};

export default CommunityNavigator;
