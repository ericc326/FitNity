import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutStackParamList } from "../navigation/WorkoutNavigator";

type Props = NativeStackScreenProps<WorkoutStackParamList, "FilterExercise">;

const FilterExercise = ({ navigation }: Props) => {
const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  
  const places = ['Gym', 'Home', 'Outdoors'];
  const bodyParts = ['Legs', 'Chest', 'Back', 'Abs', 'Delts', 'Arms'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.time}>8:41</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Filter Exercise</Text>
        
        <Text style={styles.sectionTitle}>Workout Place</Text>
        <View style={styles.filterGroup}>
          {places.map((place, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.filterButton,
                selectedPlace === place && styles.selectedFilter
              ]}
              onPress={() => setSelectedPlace(place)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedPlace === place && styles.selectedFilterText
              ]}>
                {place}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={styles.sectionTitle}>Body part</Text>
        <View style={styles.filterGroup}>
          {bodyParts.map((part, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.filterButton,
                selectedBodyPart === part && styles.selectedFilter
              ]}
              onPress={() => setSelectedBodyPart(part)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedBodyPart === part && styles.selectedFilterText
              ]}>
                {part}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity 
          style={styles.applyButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.applyButtonText}>Apply filter</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c2e', // Dark background
  },
  header: {
    padding: 15,
    alignItems: 'flex-end',
    backgroundColor: '#2a2a3a', // Dark header
  },
  time: {
    fontSize: 16,
    color: '#ffffff', // White text
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#ffffff', // White text
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    marginTop: 20,
    color: '#ffffff', // White text
  },
  filterGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  filterButton: {
    backgroundColor: '#2a2a3a', // Dark button
    padding: 12,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#5A556B', // Purple border
  },
  selectedFilter: {
    backgroundColor: '#5A3BFF', // Purple selected
    borderColor: '#5A3BFF',
  },
  filterButtonText: {
    color: '#ffffff', // White text
  },
  selectedFilterText: {
    color: '#ffffff', // White text
  },
  applyButton: {
    backgroundColor: '#5A3BFF', // Purple button
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default FilterExercise;
