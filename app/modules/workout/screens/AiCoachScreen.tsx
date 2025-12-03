import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingIndicator from "../../../components/LoadingIndicator";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { WorkoutStackParamList } from "../navigation/WorkoutNavigator";

const API_KEY = "d2b81624-30bb-4207-92c6-9f879a365eec";
const POSETRACKER_API = "https://app.posetracker.com/pose_tracker/tracking";
// const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type PoseKeypoint = {
  name: string;
  x: number;
  y: number;
  score: number;
};

type PoseTrackerInitialization = {
  type: "initialization";
  message: string;
  ready: boolean;
};

type PoseTrackerKeypoints = {
  type: "keypoints";
  data: PoseKeypoint[];
};

type PoseTrackerCounter = {
  type: "counter";
  current_count: number;
};

type PoseTrackerData =
  | PoseTrackerInitialization
  | PoseTrackerKeypoints
  | PoseTrackerCounter;

export default function AiCoachScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<WorkoutStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [poseReady, setPoseReady] = useState(false);
  const [keypoints, setKeypoints] = useState<PoseKeypoint[]>([]);
  const [reps, setReps] = useState(0);
  const [exercise, setExercise] = useState("squat");
  const [webLoading, setWebLoading] = useState(true);

  const exercises = ["Squat", "Push-up", "Bicep Curl", "Lunge", "Plank"];

  // Request camera permission when not granted
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const permissionPending = permission == null || permission.granted === false;

  const posetrackerUrl = useMemo(() => {
    return `${POSETRACKER_API}?token=${API_KEY}&exercise=${exercise.toLowerCase()}&difficulty=easy&width=0&height=0&isMobile=true&keypoints=true&t=${Date.now()}`;
  }, [exercise]);

  const jsBridge = `
    window.addEventListener('message', function(event) {
      window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
    });
    window.webViewCallback = function(data) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    };
    const originalPostMessage = window.postMessage;
    window.postMessage = function(data) {
      window.ReactNativeWebView.postMessage(typeof data === 'string' ? data : JSON.stringify(data));
    };
    true;
  `;

  const handleWebViewMessage = (event: any) => {
    try {
      const data: PoseTrackerData = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case "initialization":
          setPoseReady(data.ready);
          setWebLoading(false);
          break;
        case "keypoints":
          setKeypoints(data.data);
          if (webLoading) setWebLoading(false);
          break;
        case "counter":
          setReps(data.current_count);
          break;
        default:
          break;
      }
    } catch (e) {
      // console.error("Failed to parse message:", event.nativeEvent.data);
    }
  };

  const handleCancel = () => {
    setPoseReady(false);
    setKeypoints([]);
    setReps(0);
    navigation.goBack(); // navigate back to WorkoutScreen
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Exercise selection row */}
      <View style={styles.headerContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10 }}
        >
          {exercises.map((ex) => (
            <TouchableOpacity
              key={ex}
              style={[
                styles.exerciseButton,
                exercise === ex.toLowerCase() && styles.activeExerciseButton,
              ]}
              onPress={() => {
                setExercise(ex.toLowerCase());
                setReps(0);
                setKeypoints([]);
                setPoseReady(false);
                setWebLoading(true);
              }}
            >
              <Text
                style={[
                  styles.exerciseText,
                  exercise === ex.toLowerCase() && styles.activeExerciseText,
                ]}
              >
                {ex}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.infoContainer}>
        {!poseReady ? (
          <Text style={styles.infoText}>
            {permissionPending
              ? "Requesting camera permission..."
              : webLoading
                ? "Loading camera..."
                : "Initializing AI..."}
          </Text>
        ) : (
          <>
            <Text style={styles.infoText}>AI Ready ✅</Text>
            <Text style={styles.infoText}>Reps: {reps}</Text>
          </>
        )}
      </View>

      {/* WebView */}
      <View style={styles.webviewContainer}>
        <WebView
          key={exercise}
          source={{ uri: posetrackerUrl }}
          style={styles.webView}
          containerStyle={{ backgroundColor: "transparent" }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsAirPlayForMediaPlayback={false}
          allowsPictureInPictureMediaPlayback={false}
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
          injectedJavaScript={jsBridge}
          onMessage={handleWebViewMessage}
          originWhitelist={["*"]}
          mixedContentMode="always"
          mediaCapturePermissionGrantType="grant"
        />

        {/* Loading Indicator centered over WebView */}
        {(permissionPending || webLoading || !poseReady) && (
          <View style={styles.loadingOverlay}>
            <LoadingIndicator color="#ffffff" />
          </View>
        )}
      </View>

      {/* 4. Footer (Cancel Button) */}
      <View style={styles.footerContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel Scan</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  headerContainer: {
    height: 60, // Fixed height for header
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    zIndex: 10,
  },
  infoContainer: {
    // No absolute positioning needed!
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    zIndex: 10,
  },
  webviewContainer: {
    flex: 1,
    position: "relative",
  },
  webView: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
    zIndex: 1,
  },
  footerContainer: {
    padding: 20,
    backgroundColor: "transparent",
    position: "absolute", // Floating button is okay
    bottom: 0,
    width: "100%",
    alignItems: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, // Covers the webviewContainer
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  infoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginVertical: 2,
  },
  exerciseButton: {
    backgroundColor: "#333",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginHorizontal: 5,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#444",
  },
  activeExerciseButton: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  exerciseText: {
    color: "#aaa",
    fontWeight: "600",
  },
  activeExerciseText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#FF4444",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: "center",
    zIndex: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cancelText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
