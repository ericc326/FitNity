import React, { useEffect, useState, useMemo, useRef } from "react";
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
import * as Speech from "expo-speech";

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

// 2. DEFINE NEW FEEDBACK TYPE
type PoseTrackerFeedback = {
  type: "feedback";
  message: string;
};

type PoseTrackerData =
  | PoseTrackerInitialization
  | PoseTrackerKeypoints
  | PoseTrackerCounter
  | PoseTrackerFeedback;

export default function AiCoachScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<WorkoutStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [poseReady, setPoseReady] = useState(false);
  const [keypoints, setKeypoints] = useState<PoseKeypoint[]>([]);
  const [reps, setReps] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string>(""); // 3. NEW STATE FOR TEXT FEEDBACK
  const [exercise, setExercise] = useState("squat");
  const [webLoading, setWebLoading] = useState(true);
  const [postureMessage, setPostureMessage] = useState<string | null>(null);
  const lastGoodRepRef = useRef(0);
  const lastFeedbackRef = useRef(0);

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

  // 4. UPDATED MESSAGE HANDLER WITH FEEDBACK LOGIC
  const handleWebViewMessage = (event: any) => {
    try {
      const data: PoseTrackerData = JSON.parse(event.nativeEvent.data);

      // Clear previous feedback when a new count or initialization happens
      if (data.type === "counter" || data.type === "initialization") {
        setFeedbackMessage("");
        Speech.stop();
      }

      switch (data.type) {
        case "initialization":
          setPoseReady(data.ready);
          setWebLoading(false);
          break;
        case "keypoints":
          setKeypoints(data.data);
          if (exercise === "squat") {
            checkSquatPosture(data.data);
          } else if (exercise === "push-up") {
            checkPushUpPosture(data.data);
          } else if (exercise === "plank") {
            checkPlankPosture(data.data);
          } else if (exercise === "lunge") {
            checkLungePosture(data.data);
          } else if (exercise === "bicep curl") {
            checkBicepCurlPosture(data.data);
          }

          if (webLoading) setWebLoading(false);
          break;

        case "counter":
          setReps(data.current_count);
          break;
        case "feedback": // 👈 HANDLE POSTURE FEEDBACK
          setFeedbackMessage(data.message); // Set text state
          Speech.speak(data.message, {
            // Speak the message
            language: "en-US",
            rate: 0.9, // Slightly slower speaking rate for coaching
            pitch: 1.1, // Slightly higher pitch to stand out
          });
          break;
        default:
          break;
      }
    } catch (e) {
      // console.error("Failed to parse message:", event.nativeEvent.data);
    }
  };

  const handleCancel = () => {
    Speech.stop(); // Stop any ongoing speech when canceling
    setPoseReady(false);
    setKeypoints([]);
    setReps(0);
    setFeedbackMessage("");
    navigation.goBack(); // navigate back to WorkoutScreen
  };

  const speakFeedback = (message: string) => {
    Speech.stop();
    Speech.speak(message, {
      language: "en",
      rate: 0.9,
    });
  };

  const calculateAngle = (
    a: PoseKeypoint,
    b: PoseKeypoint,
    c: PoseKeypoint
  ) => {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };

    const dot = ab.x * cb.x + ab.y * cb.y;
    const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
    const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);

    return (Math.acos(dot / (magAB * magCB)) * 180) / Math.PI;
  };

  const speakGoodRep = () => {
    const now = Date.now();

    if (now - lastGoodRepRef.current > 4000) {
      lastGoodRepRef.current = now;
      const message = "Good rep!";
      setPostureMessage(message);
      speakFeedback(message);
    }
  };

  const checkSquatPosture = (points: PoseKeypoint[]) => {
    const get = (n: string) =>
      points.find((p) => p.name === n && p.score > 0.5);

    const hip = get("left_hip");
    const knee = get("left_knee");
    const ankle = get("left_ankle");
    const shoulder = get("left_shoulder");

    if (!hip || !knee || !ankle || !shoulder) return;

    const kneeAngle = calculateAngle(hip, knee, ankle);
    const backAngle = calculateAngle(shoulder, hip, knee);

    let message: string | null = null;

    if (kneeAngle > 160) message = "Go deeper into the squat";
    else if (backAngle < 150) message = "Keep your back straight";

    const now = Date.now();
    if (message && now - lastFeedbackRef.current > 3000) {
      lastFeedbackRef.current = now;
      setPostureMessage(message);
      speakFeedback(message);
    }

    if (!message) {
      speakGoodRep();
    }
  };

  const checkPushUpPosture = (points: PoseKeypoint[]) => {
    const get = (n: string) =>
      points.find((p) => p.name === n && p.score > 0.5);

    const shoulder = get("left_shoulder");
    const hip = get("left_hip");
    const ankle = get("left_ankle");
    const elbow = get("left_elbow");
    const wrist = get("left_wrist");

    if (!shoulder || !hip || !ankle || !elbow || !wrist) return;

    // Body alignment (shoulder-hip-ankle should be straight)
    const bodyAngle = calculateAngle(shoulder, hip, ankle);

    // Elbow angle (depth check)
    const elbowAngle = calculateAngle(shoulder, elbow, wrist);

    let message: string | null = null;

    if (bodyAngle < 160) {
      message = "Keep your body straight";
    } else if (elbowAngle > 160) {
      message = "Lower your chest closer to the ground";
    }

    const now = Date.now();
    if (message && now - lastFeedbackRef.current > 3000) {
      lastFeedbackRef.current = now;
      setPostureMessage(message);
      speakFeedback(message);
    }
    if (!message) {
      speakGoodRep();
    }
  };

  const checkPlankPosture = (points: PoseKeypoint[]) => {
    const get = (n: string) =>
      points.find((p) => p.name === n && p.score > 0.5);

    const shoulder = get("left_shoulder");
    const hip = get("left_hip");
    const ankle = get("left_ankle");

    if (!shoulder || !hip || !ankle) return;

    const bodyAngle = calculateAngle(shoulder, hip, ankle);

    let message: string | null = null;

    if (bodyAngle < 165) {
      message = "Keep your body in a straight line";
    }

    const now = Date.now();
    if (message && now - lastFeedbackRef.current > 3000) {
      lastFeedbackRef.current = now;
      setPostureMessage(message);
      speakFeedback(message);
    }

    if (!message) {
      speakGoodRep();
    }
  };

  const checkLungePosture = (points: PoseKeypoint[]) => {
    const get = (n: string) =>
      points.find((p) => p.name === n && p.score > 0.5);

    const hip = get("left_hip");
    const knee = get("left_knee");
    const ankle = get("left_ankle");
    const shoulder = get("left_shoulder");

    if (!hip || !knee || !ankle || !shoulder) return;

    const kneeAngle = calculateAngle(hip, knee, ankle);
    const torsoAngle = calculateAngle(shoulder, hip, knee);

    let message: string | null = null;

    if (kneeAngle < 70) {
      message = "Do not let your knee go too far forward";
    } else if (torsoAngle < 150) {
      message = "Keep your chest upright";
    }

    const now = Date.now();
    if (message && now - lastFeedbackRef.current > 3000) {
      lastFeedbackRef.current = now;
      setPostureMessage(message);
      speakFeedback(message);
    }

    if (!message) {
      speakGoodRep();
    }
  };

  const checkBicepCurlPosture = (points: PoseKeypoint[]) => {
    const get = (n: string) =>
      points.find((p) => p.name === n && p.score > 0.5);

    const shoulder = get("left_shoulder");
    const elbow = get("left_elbow");
    const wrist = get("left_wrist");

    if (!shoulder || !elbow || !wrist) return;

    const elbowAngle = calculateAngle(shoulder, elbow, wrist);

    let message: string | null = null;

    if (elbowAngle < 40) {
      message = "Do not swing your arm";
    }

    const now = Date.now();
    if (message && now - lastFeedbackRef.current > 3000) {
      lastFeedbackRef.current = now;
      setPostureMessage(message);
      speakFeedback(message);
    }
    if (!message) {
      speakGoodRep();
    }
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
                setFeedbackMessage("");
                Speech.stop();
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
            {/* 6. DISPLAY TEXT FEEDBACK */}
            {feedbackMessage ? (
              <Text style={[styles.infoText, styles.feedbackText]}>
                🛑 {feedbackMessage}
              </Text>
            ) : (
              <Text style={styles.infoText}>
                {exercise.charAt(0).toUpperCase() + exercise.slice(1)} Mode
              </Text>
            )}
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
        {postureMessage && (
          <View style={styles.postureOverlay}>
            <Text style={styles.postureText}>{postureMessage}</Text>
          </View>
        )}

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
  // 7. NEW STYLE FOR FEEDBACK TEXT
  feedbackText: {
    color: "#FF4444", // Red color for warnings
    fontWeight: "bold",
    fontSize: 18,
    marginVertical: 4,
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
  postureOverlay: {
    position: "absolute",
    top: 120,
    alignSelf: "center",
    backgroundColor: "rgba(255,68,68,0.9)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 30,
  },
  postureText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
