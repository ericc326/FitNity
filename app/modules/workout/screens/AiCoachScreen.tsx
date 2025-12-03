import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { Camera, useCameraPermissions } from "expo-camera";

const API_KEY = "d2b81624-30bb-4207-92c6-9f879a365eec";
const POSETRACKER_API = "https://app.posetracker.com/pose_tracker/tracking";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  const [permission, requestPermission] = useCameraPermissions();
  const [poseReady, setPoseReady] = useState(false);
  const [keypoints, setKeypoints] = useState<PoseKeypoint[]>([]);
  const [reps, setReps] = useState(0);
  const [exercise, setExercise] = useState("squat");

  const exercises = ["Squat", "Push-Up", "Bicep Curl", "Lunge", "Plank"];

  // Request camera permission on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const posetrackerUrl = `${POSETRACKER_API}?token=${API_KEY}&exercise=${exercise.toLowerCase()}&difficulty=easy&width=${SCREEN_WIDTH}&height=${SCREEN_HEIGHT}&isMobile=true&keypoints=true`;

  // JS bridge for WebView
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
          break;
        case "keypoints":
          setKeypoints(data.data);
          break;
        case "counter":
          setReps(data.current_count);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error("Failed to parse message:", event.nativeEvent.data);
    }
  };

  const handleCancel = () => {
    setPoseReady(false);
    setKeypoints([]);
    setReps(0);
  };

  return (
    <View style={styles.container}>
      {/* Exercise selection row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.exerciseRow}
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
              setReps(0); // reset reps when exercise changes
              setKeypoints([]);
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

      {/* WebView */}
      <WebView
        source={{ uri: posetrackerUrl }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScript={jsBridge}
        onMessage={handleWebViewMessage}
        originWhitelist={["*"]}
        mixedContentMode="compatibility"
      />

      {/* Overlay Info */}
      <View style={styles.infoContainer}>
        {!poseReady ? (
          <Text style={styles.infoText}>Loading AI & Camera...</Text>
        ) : (
          <>
            <Text style={styles.infoText}>AI Ready ✅</Text>
            <Text style={styles.infoText}>Reps: {reps}</Text>
            <Text style={styles.infoText}>
              Keypoints detected: {keypoints.length}
            </Text>
          </>
        )}
      </View>

      {/* Keypoints */}
      {poseReady &&
        keypoints.map((kp) => (
          <View
            key={kp.name}
            style={{
              position: "absolute",
              top: kp.y,
              left: kp.x,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: "rgba(255,0,0,0.7)",
            }}
          />
        ))}

      {/* Cancel button */}
      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelText}>Cancel Scan</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  webView: {
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  infoContainer: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 10,
  },
  infoText: {
    color: "#fff",
    fontSize: 16,
    marginVertical: 2,
  },
  exerciseRow: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    zIndex: 3,
    maxHeight: 50,
  },
  exerciseButton: {
    backgroundColor: "#222",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  activeExerciseButton: {
    backgroundColor: "#4CAF50",
  },
  exerciseText: {
    color: "#fff",
    fontWeight: "600",
  },
  activeExerciseText: {
    color: "#fff",
  },
  cancelButton: {
    position: "absolute",
    bottom: 40,
    left: SCREEN_WIDTH / 4,
    right: SCREEN_WIDTH / 4,
    backgroundColor: "rgba(255,0,0,0.8)",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    zIndex: 3,
  },
  cancelText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
