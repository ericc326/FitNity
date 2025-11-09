import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  TextInput, FlatList, Image, Alert, ActivityIndicator 
} from 'react-native';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutStackParamList } from "../navigation/WorkoutNavigator";
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<WorkoutStackParamList, "SelectExercise">;

const SelectExercise = ({ navigation }: Props) => {
  const [searchText, setSearchText] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [exerciseData, setExerciseData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from ExerciseDB API
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const randomOffset = Math.floor(Math.random() * 1400);
        const response = await fetch(`https://exercisedb-api.vercel.app/api/v1/exercises?limit=100&offset=${randomOffset}`);
        const json = await response.json();

        if (json.success && Array.isArray(json.data)) {
          setExerciseData(json.data);
        } else {
          console.error("Invalid data format:", json);
          Alert.alert("Error", "Failed to load exercise data");
        }
      } catch (error) {
        console.error("Error fetching exercises:", error);
        Alert.alert("Error", "Could not fetch exercises");
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, []);

  // Filter by search
  const filteredExercises = exerciseData.filter(exercise =>
    exercise.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const toggleExerciseSelection = (exerciseName: string) => {
    setSelectedExercises(prev => 
      prev.includes(exerciseName)
        ? prev.filter(name => name !== exerciseName)
        : [...prev, exerciseName]
    );
  };

  const handleAddExercises = () => {
    if (selectedExercises.length === 0) {
      Alert.alert('No Selection', 'Please select at least one exercise');
      return;
    }
    navigation.navigate('WorkoutSection', { 
      selectedExercises: selectedExercises 
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#5A3BFF" />
        <Text style={{ color: 'white', marginTop: 10 }}>Loading exercises...</Text>
      </View>
    );
  }

return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.time}>9:41</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Select Exercise</Text>
        
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons 
            name="magnify" 
            size={24} 
            color="#8E8E9E" 
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor="#8E8E9E"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => navigation.navigate('FilterExercise')}
          >
            <MaterialCommunityIcons 
              name="filter-variant" 
              size={20} 
              color="#5A3BFF" 
            />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={filteredExercises}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.exerciseItem,
                selectedExercises.includes(item.name) && styles.selectedExercise
              ]}
              onPress={() => toggleExerciseSelection(item.name)}
            >
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: item.gifUrl }} 
                  style={styles.exerciseImage}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exerciseText}>{item.name}</Text>
                <Text style={styles.categoryText}>
                  {item.bodyParts ? item.bodyParts.join(', ') : 'Unknown'}
                </Text>
              </View>
              {selectedExercises.includes(item.name) && (
                <MaterialCommunityIcons 
                  name="check-circle" 
                  size={24} 
                  color="#5A3BFF" 
                />
              )}
            </TouchableOpacity>
          )}
          keyExtractor={item => item.exerciseId}
          scrollEnabled={false}
        />

        {selectedExercises.length > 0 && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddExercises}
          >
            <Text style={styles.addButtonText}>
              Add {selectedExercises.length} Exercise(s)
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

// ---------------------------- STYLES ----------------------------

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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2D',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    height: 50,
    fontSize: 16,
  },
  filterRow: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  filterButton: {
    backgroundColor: '#1E1E2D',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonText: {
    color: '#5A3BFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
  },
  exerciseText: {
    fontSize: 16,
    color: 'white',
  },
  categoryText: {
    fontSize: 12,
    color: '#8E8E9E',
    marginTop: 4,
  },
  selectedExercise: {
    backgroundColor: '#2A2A3A',
  },
  addButton: {
    backgroundColor: '#5A3BFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SelectExercise;