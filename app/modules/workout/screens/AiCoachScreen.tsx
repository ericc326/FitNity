import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PermissionsAndroid,
  Platform,
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

  // Request camera permission on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const exercise = "squat";

  const posetrackerUrl = `${POSETRACKER_API}?token=${API_KEY}&exercise=${exercise}&difficulty=easy&width=${SCREEN_WIDTH}&height=${SCREEN_HEIGHT}&isMobile=true&keypoints=true`;

  // JS bridge for communication between WebView and React Native
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

  // Handle WebView messages
  const handleWebViewMessage = (event: any) => {
    try {
      const data: PoseTrackerData = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case "initialization":
          setPoseReady(data.ready);
          console.log(
            "PoseTracker status:",
            data.message,
            "Ready:",
            data.ready
          );
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

  return (
    <View style={styles.container}>
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
        onError={(e) => console.warn("WebView error:", e.nativeEvent)}
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

      {/* Render keypoints as circles */}
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
    top: 50,
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
});
