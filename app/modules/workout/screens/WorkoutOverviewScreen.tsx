import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutStackParamList } from "../navigation/WorkoutNavigator";

type Props = NativeStackScreenProps<WorkoutStackParamList, "WorkoutOverview">;

type Level = "Beginner" | "Intermediate" | "Advanced";

type WorkoutPlan = Record<
  Level,
  {
    sets: number;
    reps: number;
    rest: number;
  }
>;

const WorkoutOverviewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { workout, level = "Beginner" } = route.params || {};

  const plans: WorkoutPlan = {
    Beginner: { sets: 3, reps: 8, rest: 90 },
    Intermediate: { sets: 4, reps: 10, rest: 60 },
    Advanced: { sets: 5, reps: 12, rest: 45 },
  };

  const plan = plans[level as Level] || plans.Beginner;

  const startWorkout = () => {
    if (!plan || !workout) {
      Alert.alert("Error", "Workout plan or exercises not found.");
      return;
    }

    navigation.navigate("ActiveWorkout", {
      workout,
      sets: plan.sets,
      reps: plan.reps,
      rest: plan.rest,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          padding: 12,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{workout?.title || "Workout Overview"}</Text>
        <Text style={styles.subtitle}>Level: {level}</Text>

        <Text style={styles.details}>
          {plan.sets} Sets × {plan.reps} Reps per Exercise
        </Text>
        <Text style={styles.details}>Rest: {plan.rest}s per set</Text>

        <Text style={[styles.subtitle, { marginTop: 30 }]}>
          Exercises in this workout
        </Text>

        {workout?.exercises && workout.exercises.length > 0 ? (
          workout.exercises.map((ex: any, index: number) => (
            <View key={index} style={styles.exerciseCard}>
              {ex.imageURL && (
                <Image
                  source={{ uri: ex.imageURL }}
                  style={styles.exerciseImage}
                />
              )}
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <Text style={styles.exerciseMeta}>
                  Body Part: {ex.bodyPart || "N/A"}
                </Text>
                {ex.targetMuscles && (
                  <Text style={styles.exerciseMeta}>
                    Target:{" "}
                    {Array.isArray(ex.targetMuscles)
                      ? ex.targetMuscles.join(", ")
                      : ex.targetMuscles}
                  </Text>
                )}
              </View>
            </View>
          ))
        ) : (
          <Text style={{ color: "#aaa", textAlign: "center", marginTop: 10 }}>
            No exercises found.
          </Text>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.button} onPress={startWorkout}>
        <Text style={styles.buttonText}>Start Workout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    color: "#aaa",
    fontSize: 18,
    marginBottom: 10,
  },
  details: {
    color: "#ccc",
    fontSize: 16,
    marginBottom: 6,
  },
  exerciseCard: {
    flexDirection: "row",
    backgroundColor: "#3C3952",
    borderRadius: 10,
    marginBottom: 12,
    padding: 10,
    alignItems: "center",
  },
  exerciseImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 10,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  exerciseMeta: {
    color: "#ccc",
    fontSize: 12,
    marginTop: 2,
  },
  button: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "#f57c00",
    paddingVertical: 14,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default WorkoutOverviewScreen;
