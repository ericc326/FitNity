import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutStackParamList } from "../navigation/WorkoutNavigator";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';

type Props = NativeStackScreenProps<WorkoutStackParamList, "WorkoutSection">;

type WorkoutItem = {
  id: string;
  type: 'exercise' | 'rest';
  name: string;
  duration?: number; // in seconds, only for rest
};

const CreateWorkout = ({ navigation, route }: Props) => {
  const [workoutName, setWorkoutName] = useState('My Workout');
  const [sectionName, setSectionName] = useState('Section 1');
  const [workoutItems, setWorkoutItems] = useState<WorkoutItem[]>([]);

  // Add exercise from SelectExercise screen
  React.useEffect(() => {
    if (route.params?.selectedExercise) {
      addExercise(route.params.selectedExercise);
    }
  }, [route.params?.selectedExercise]);

  const addExercise = (exerciseName: string) => {
    setWorkoutItems(prev => [
      ...prev,
      { id: Date.now().toString(), type: 'exercise', name: exerciseName }
    ]);
  };

  const addRest = () => {
    setWorkoutItems(prev => [
      ...prev,
      { id: Date.now().toString(), type: 'rest', name: 'Rest', duration: 60 }
    ]);
  };

  const updateRestTime = (id: string, change: number) => {
    setWorkoutItems(prev => 
      prev.map(item => 
        item.id === id && item.type === 'rest' 
          ? { ...item, duration: Math.max(10, (item.duration || 0) + change) } 
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setWorkoutItems(prev => prev.filter(item => item.id !== id));
  };

  const createWorkout = () => {
    // Here you would save the workout to your database/state
    console.log('Creating workout:', {
      name: workoutName,
      section: sectionName,
      items: workoutItems
    });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.time}>9:41</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Workout Section</Text>
        
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons 
            name="pencil" 
            size={20} 
            color="#5A3BFF" 
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Workout name"
            placeholderTextColor="#8E8E9E"
            value={workoutName}
            onChangeText={setWorkoutName}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons 
            name="pencil" 
            size={20} 
            color="#5A3BFF" 
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Section name"
            placeholderTextColor="#8E8E9E"
            value={sectionName}
            onChangeText={setSectionName}
          />
        </View>

        {/* Workout Items List */}
        <View style={styles.workoutItemsContainer}>
          {workoutItems.map((item) => (
            <View key={item.id} style={styles.workoutItem}>
              {item.type === 'exercise' ? (
                <>
                  <MaterialCommunityIcons name="dumbbell" size={20} color="#5A3BFF" />
                  <Text style={styles.itemText}>{item.name}</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="timer-outline" size={20} color="#5A3BFF" />
                  <View style={styles.restTimeContainer}>
                    <TouchableOpacity onPress={() => updateRestTime(item.id, -10)}>
                      <MaterialCommunityIcons name="minus" size={20} color="#5A3BFF" />
                    </TouchableOpacity>
                    <Text style={styles.itemText}>{item.duration} sec</Text>
                    <TouchableOpacity onPress={() => updateRestTime(item.id, 10)}>
                      <MaterialCommunityIcons name="plus" size={20} color="#5A3BFF" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => removeItem(item.id)}
              >
                <MaterialCommunityIcons name="close" size={20} color="#F44336" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.addButton} onPress={addRest}>
            <MaterialCommunityIcons name="timer-outline" size={20} color="#5A3BFF" />
            <Text style={styles.addButtonText}>Add Rest</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('SelectExercise')}
          >
            <MaterialCommunityIcons name="dumbbell" size={20} color="#5A3BFF" />
            <Text style={styles.addButtonText}>Add Exercise</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.createButton,
            workoutItems.length === 0 && styles.disabledButton
          ]}
          onPress={createWorkout}
          disabled={workoutItems.length === 0}
        >
          <Text style={styles.createButtonText}>Create Workout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  header: {
    padding: 15,
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 16,
    color: '#8E8E9E',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2D',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: 'white',
    height: 56,
    fontSize: 16,
  },
  workoutItemsContainer: {
    backgroundColor: '#1E1E2D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3A',
  },
  itemText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 12,
    flex: 1,
  },
  restTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  removeButton: {
    marginLeft: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#1E1E2D',
    padding: 16,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 16,
    color: '#5A3BFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  createButton: {
    backgroundColor: '#5A3BFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateWorkout;