import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutStackParamList } from "../navigation/WorkoutNavigator";

type Props = NativeStackScreenProps<WorkoutStackParamList, "ActiveWorkout">;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ActiveWorkoutScreen: React.FC<Props> = ({ route, navigation }) => {
  const { workout, sets, reps, rest } = route.params;
  const exerciseList = workout.exerciseList || [];

  const [currentExercise, setCurrentExercise] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isRest, setIsRest] = useState(false);
  const [completedModal, setCompletedModal] = useState(false);

  const radius = 90;
  const circumference = 2 * Math.PI * radius;

  const progressAnim = useRef(new Animated.Value(0)).current;

  const totalSets = exerciseList.length * sets;
  const progress = (currentExercise * sets + currentSet - 1) / totalSets;

  // Animate the circle based on progress
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentExercise, currentSet]);

  // Timer running logic
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (isRunning) {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }

    return () => interval && clearInterval(interval);
  }, [isRunning]);

  // Auto move to next when rest time ends
  useEffect(() => {
    if (isRest && timer >= rest && isRunning) handleNext();
  }, [timer]);

  const handleNext = () => {
    setIsRunning(false);
    setTimer(0);

    // If currently working → go to rest
    if (!isRest && currentSet < sets) {
      setIsRest(true);
      return;
    }

    // After rest → next set
    if (isRest && currentSet < sets) {
      setCurrentSet((s) => s + 1);
      setIsRest(false);
      return;
    }

    // Move to next exercise
    if (currentExercise < exerciseList.length - 1) {
      setCurrentExercise((e) => e + 1);
      setCurrentSet(1);
      setIsRest(false);
      return;
    }

    // Workout completed
    setCompletedModal(true);
  };

  const dashOffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const current = exerciseList[currentExercise];

  return (
    <View style={styles.container}>
      {/* TOP HEADER */}
      <View style={styles.headerBox}>
        <Text style={styles.workoutName}>{current?.name || "Workout"}</Text>
        <Text style={styles.detailsText}>
          {sets} Sets • {reps} Reps • {rest}s Rest
        </Text>
      </View>

      {/* TIMER */}
      <View style={styles.timerWrapper}>
        <Svg width={230} height={230} viewBox="0 0 230 230">
          <Circle
            cx="115"
            cy="115"
            r={radius}
            stroke="#3a3550"
            strokeWidth="14"
            fill="none"
          />
          <AnimatedCircle
            cx="115"
            cy="115"
            r={radius}
            stroke="#b9f7e4"
            strokeWidth="14"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </Svg>

        <Text style={styles.timerText}>
          {isRest ? `${rest - timer}s` : `${timer}s`}
        </Text>
      </View>

      {/* PAUSE / START */}
      <TouchableOpacity
        style={styles.bigButton}
        onPress={() => setIsRunning(!isRunning)}
      >
        <Text style={styles.bigButtonText}>
          {isRunning ? "Pause" : "Start"}
        </Text>
      </TouchableOpacity>

      {/* BOTTOM CARD */}
      <View style={styles.bottomCard}>
        <View style={styles.stepRow}>
          <Text style={styles.stepLabel}>{isRest ? "Rest" : "Work"}</Text>
          <Text style={styles.stepValue}>
            {isRest ? rest + " sec" : reps + " reps"}
          </Text>
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {isRest ? "Next Exercise" : "Finish Set"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* COMPLETED MODAL */}
      <Modal transparent visible={completedModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Workout Completed!</Text>
            <Text style={styles.modalSubtitle}>Great job today 🎉</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setCompletedModal(false);
                navigation.navigate("HomeScreen");
              }}
            >
              <Text style={styles.modalButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ActiveWorkoutScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1d1a2b",
    paddingTop: 60,
    alignItems: "center",
  },

  headerBox: {
    alignItems: "center",
    marginBottom: 15,
  },
  workoutName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  detailsText: {
    color: "#cfcfcf",
    fontSize: 14,
    marginTop: 4,
  },

  timerWrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },
  timerText: {
    position: "absolute",
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
  },

  bigButton: {
    width: 100,
    height: 100,
    backgroundColor: "#f7eecb",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    marginBottom: 20,
  },
  bigButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },

  bottomCard: {
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 25,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    position: "absolute",
    bottom: 0,
  },

  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  stepLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#444",
  },
  stepValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#444",
  },

  nextButton: {
    backgroundColor: "#f8cce1",
    paddingVertical: 16,
    marginHorizontal: 30,
    borderRadius: 12,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "75%",
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#b9f7e4",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 15,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
