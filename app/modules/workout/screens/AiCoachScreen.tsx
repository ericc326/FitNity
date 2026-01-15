import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
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

// ✅ 1. DEFINE DELAY CONSTANT (4 Seconds)
const FEEDBACK_DELAY = 4000;

type PoseKeypoint = {
  name: string;
  x: number;
  y: number;
  score: number;
};

type PoseTrackerData = {
  type: "initialization" | "keypoints" | "counter" | "feedback";
  message?: string;
  ready?: boolean;
  data?: PoseKeypoint[];
  current_count?: number;
};

export default function AiCoachScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<WorkoutStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [poseReady, setPoseReady] = useState(false);
  const [keypoints, setKeypoints] = useState<PoseKeypoint[]>([]);

  const [reps, setReps] = useState(0);
  const [lastRepCount, setLastRepCount] = useState(0);

  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error">(
    "error"
  );

  const [exercise, setExercise] = useState("squat");
  const [webLoading, setWebLoading] = useState(true);
  const [postureMessage, setPostureMessage] = useState<string | null>(null);

  // Refs to track time
  const lastGoodRepRef = useRef(0);
  const lastFeedbackRef = useRef(0);

  const exercises = ["Squat", "Push-up", "Lunge", "Plank"];

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Listen for Rep Increases
  useEffect(() => {
    if (reps > lastRepCount && reps > 0) {
      triggerFeedback("Good rep!", true);
      setLastRepCount(reps);
    }
  }, [reps]);

  const permissionPending = permission == null || permission.granted === false;

  const posetrackerUrl = useMemo(() => {
    const apiExerciseName = exercise.toLowerCase().replace("-", "");
    return `${POSETRACKER_API}?token=${API_KEY}&exercise=${apiExerciseName}&difficulty=easy&width=0&height=0&isMobile=true&keypoints=true&t=${Date.now()}`;
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

      if (data.type === "counter" || data.type === "initialization") {
        setFeedbackMessage("");
        Speech.stop();
      }

      switch (data.type) {
        case "initialization":
          setPoseReady(data.ready ?? false);
          setWebLoading(false);
          break;
        case "keypoints":
          setKeypoints(data.data || []);
          if (exercise === "squat") {
            checkSquatPosture(data.data || []);
          } else if (exercise === "push-up") {
            checkPushUpPosture(data.data || []);
          } else if (exercise === "plank") {
            checkPlankPosture(data.data || []);
          } else if (exercise === "lunge") {
            checkLungePosture(data.data || []);
          }

          if (webLoading) setWebLoading(false);
          break;

        case "counter":
          setReps(data.current_count || 0);
          break;
        case "feedback":
          if (data.message) triggerFeedback(data.message);
          break;
        default:
          break;
      }
    } catch (e) {
      // Ignore errors
    }
  };

  const handleCancel = () => {
    Speech.stop();
    setPoseReady(false);
    setKeypoints([]);
    setReps(0);
    setLastRepCount(0);
    setFeedbackMessage("");
    navigation.goBack();
  };

  const triggerFeedback = (message: string, isGoodRep = false) => {
    const now = Date.now();

    // A. Handle "Good Rep" (Positive Reinforcement)
    if (isGoodRep) {
      if (now - lastGoodRepRef.current > 3000) {
        lastGoodRepRef.current = now;

        setFeedbackType("success");
        setFeedbackMessage(message);
        setPostureMessage(message);

        // We do NOT stop previous speech here (based on your preference)
        Speech.speak(message, { language: "en-US", rate: 0.9, pitch: 1.1 });
      }
      return;
    }

    // B. Handle Corrections (Negative Feedback)
    if (now - lastFeedbackRef.current > FEEDBACK_DELAY) {
      lastFeedbackRef.current = now;

      setFeedbackType("error"); // ✅ Set Red
      setFeedbackMessage(message);
      setPostureMessage(message);

      Speech.stop(); // Stop previous talking for errors
      Speech.speak(message, {
        language: "en-US",
        rate: 0.9,
        pitch: 1.0,
      });
    }
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

  // --- POSTURE CHECKS ---

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

    if (kneeAngle > 160) triggerFeedback("Go deeper into the squat");
    else if (backAngle < 150) triggerFeedback("Keep your back straight");
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

    const bodyAngle = calculateAngle(shoulder, hip, ankle);
    const elbowAngle = calculateAngle(shoulder, elbow, wrist);

    if (bodyAngle < 160) triggerFeedback("Keep your body straight");
    else if (elbowAngle > 160) triggerFeedback("Lower chest to ground");
  };

  const checkPlankPosture = (points: PoseKeypoint[]) => {
    const get = (n: string) =>
      points.find((p) => p.name === n && p.score > 0.5);
    const shoulder = get("left_shoulder");
    const hip = get("left_hip");
    const ankle = get("left_ankle");

    if (!shoulder || !hip || !ankle) return;

    const bodyAngle = calculateAngle(shoulder, hip, ankle);

    if (bodyAngle < 165) triggerFeedback("Straighten your hips");
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

    if (kneeAngle < 70) triggerFeedback("Watch your knee");
    else if (torsoAngle < 150) triggerFeedback("Keep chest upright");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
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
                setLastRepCount(0);
                setKeypoints([]);
                setPoseReady(false);
                setWebLoading(true);
                setFeedbackMessage("");
                setPostureMessage(null);
                setFeedbackType("error"); // Reset color
                Speech.stop();
                lastFeedbackRef.current = 0;
                lastGoodRepRef.current = 0;
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
              ? "Requesting camera..."
              : webLoading
                ? "Loading AI..."
                : "Initializing..."}
          </Text>
        ) : (
          <>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Text style={styles.statusText}>AI Active 🟢</Text>
              <Text style={styles.statusText}>•</Text>
              <Text style={styles.statusText}>{exercise.toUpperCase()}</Text>
            </View>

            <View style={styles.repContainer}>
              <Text style={styles.repNumber}>{reps}</Text>
              <Text style={styles.repLabel}>REPS</Text>
            </View>
          </>
        )}
      </View>

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
          <View
            style={[
              styles.postureOverlay,
              feedbackType === "success"
                ? styles.feedbackSuccess
                : styles.feedbackError,
            ]}
          >
            <Text style={styles.postureText}>{postureMessage}</Text>
          </View>
        )}

        {(permissionPending || (webLoading && !poseReady)) && (
          <View style={styles.loadingOverlay}>
            <LoadingIndicator color="#ffffff" />
          </View>
        )}
      </View>

      <View style={styles.footerContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>End Session</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#262135" },
  headerContainer: {
    height: 60,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    zIndex: 10,
  },

  infoContainer: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)", // Slightly darker for legibility
    paddingVertical: 6, // 🚨 REDUCED from 15 to 6 to make it smaller
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    zIndex: 10,
  },

  statusText: {
    color: "#ccc",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
  },

  repContainer: {
    alignItems: "center",
    marginTop: 2,
  },

  repNumber: {
    color: "#4CAF50",
    fontSize: 56,
    fontWeight: "900",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    lineHeight: 60,
  },

  repLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: -5,
    letterSpacing: 2,
  },

  // Base Feedback Style
  feedbackContainer: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  // ✅ COLORS
  feedbackError: { backgroundColor: "rgba(255, 68, 68, 0.8)" }, // RED
  feedbackSuccess: { backgroundColor: "#4CAF50" }, // GREEN

  feedbackText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 24,
    textAlign: "center",
    textTransform: "uppercase",
  },

  webviewContainer: { flex: 1, position: "relative" },
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
    position: "absolute",
    bottom: 0,
    width: "100%",
    alignItems: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
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
  feedbackTextSmall: {
    color: "#FF4444",
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
  activeExerciseButton: { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
  exerciseText: { color: "#aaa", fontWeight: "600" },
  activeExerciseText: { color: "#fff", fontWeight: "bold" },
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
  cancelText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  // Overlay on camera
  postureOverlay: {
    position: "absolute",
    top: 40,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 30,
  },
  postureText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
