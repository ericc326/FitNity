import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, FlatList, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ImageSourcePropType } from 'react-native';
import YouTube from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import AiCoachScreen from './AiCoachScreen';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WorkoutStackParamList } from '../navigation/WorkoutNavigator';

const { width } = Dimensions.get('window');

interface Exercise {
  id: string;
  name: string;
  category: string;
  calories: number;
  difficulty: string;
  description: string;
  steps: string[];
  image: ImageSourcePropType;
  videoId: string; 
}

interface ProgressItem {
  id: string;
  exercise: string;
  category: string;
  weight: string;
  startingBest: number;
  currentBest: number;
  growth?: string;
}

const exerciseData: Exercise[] = [
  {
    id: '1',
    name: 'Box Jumps',
    category: 'Legs',
    calories: 120,
    difficulty: 'Medium',
    description: 'Box jumps are a plyometric exercise that involves jumping onto a box or platform from a standing position.',
    steps: [
      'Stand facing the box with feet shoulder-width apart',
      'Bend knees and swing arms back',
      'Explosively jump onto the box',
      'Land softly with knees slightly bent'
    ],
  image: require('../../../assets/boxjump.png'),
  videoId: 'hxldG9FX4j4'
  },
  {
    id: '2',
    name: 'Squats',
    category: 'Legs',
    calories: 80,
    difficulty: 'Easy',
    description: 'A squat is a strength exercise in which the trainee lowers their hips from a standing position and then stands back up.',
    steps: [
      'Stand with feet shoulder-width apart',
      'Lower your body as far as you can by pushing your hips back',
      'Keep your chest up and your back straight',
      'Press through your heels to return to starting position'
    ],
        image: require('../../../assets/squat.png'),
          videoId: 'hxldG9FX4j4'
  },
  {
    id: '3',
    name: 'Deadlift',
    category: 'Back',
    calories: 150,
    difficulty: 'Hard',
    description: 'The deadlift is a weight training exercise in which a loaded barbell or bar is lifted off the ground to the level of the hips.',
    steps: [
      'Stand with your mid-foot under the barbell',
      'Bend over and grab the bar with a shoulder-width grip',
      'Bend your knees until your shins touch the bar',
      'Lift the bar by straightening your back and legs'
    ],
        image: require('../../../assets/deadlift.png'),
          videoId: 'hxldG9FX4j4'
  },
  {
    id: '4',
    name: 'Front Squat',
    category: 'Legs',
    calories: 100,
    difficulty: 'Medium',
    description: 'A front squat is a compound exercise that targets the muscles of the upper legs, hips, and buttocks.',
    steps: [
      'Rest the barbell on your front deltoids',
      'Keep your elbows high and upper arms parallel to the floor',
      'Descend into a squat position',
      'Drive through your heels to return to standing position'
    ],
        image: require('../../../assets/frontsquat.png'),
          videoId: 'hxldG9FX4j4'
  },
];

const progressData: ProgressItem[] = [
  {
    id: '1',
    exercise: 'Push Ups',
    category: 'Chest',
    weight: 'Body Weight',
    startingBest: 30,
    currentBest: 42,
    growth: '+40%'
  },
  {
    id: '2',
    exercise: 'Incline Bench',
    category: 'Chest',
    weight: '80kg',
    startingBest: 3,
    currentBest: 12,
    growth: '+300%'
  },
  {
    id: '3',
    exercise: 'Dumbbell Lateral Raise',
    category: 'Shoulders',
    weight: '16kg',
    startingBest: 12,
    currentBest: 16,
    growth: '+33%'
  },
  {
    id: '4',
    exercise: 'Deadlift',
    category: 'Back',
    weight: '100kg',
    startingBest: 5,
    currentBest: 8,
    growth: '+60%'
  },
  {
    id: '5',
    exercise: 'Squats',
    category: 'Legs',
    weight: '80kg',
    startingBest: 6,
    currentBest: 10,
    growth: '+67%'
  },
];

const WorkoutScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<WorkoutStackParamList>>();
  const [activeTab, setActiveTab] = useState<'exercise' | 'progress'>('exercise');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const categories = [...new Set(progressData.map(item => item.category))];

  const filteredExercises = exerciseData.filter(exercise =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProgressData = selectedCategory === 'All' 
    ? progressData 
    : progressData.filter(item => item.category === selectedCategory);

  // Filter further by search query if needed
  const searchedProgressData = filteredProgressData.filter(item =>
    item.exercise.toLowerCase().includes(searchQuery.toLowerCase())
  );

const calculateGrowth = (starting: number, current: number): string => {
  const growth = ((current - starting) / starting) * 100;
  return `${growth >= 0 ? '+' : ''}${Math.round(growth)}%`;
};

const renderExerciseItem = ({ item }: { item: Exercise }) => (
  <TouchableOpacity 
    style={styles.exerciseItem} 
    onPress={() => setSelectedExercise(item)}
  >
    {/* Image on the left */}
    <View style={styles.imageContainer}>
      <Image 
        source={item.image} 
        style={styles.exerciseImage}
        resizeMode="cover"
      />
    </View>
    
    {/* Text content on the right */}
    <View style={styles.textContainer}>
      <Text style={styles.exerciseName}>{item.name}</Text>
      <View style={styles.exerciseMeta}>
        <Text style={styles.exerciseDifficulty}>{item.difficulty}</Text>
        <Text style={styles.exerciseCalories}> | {item.calories} Calories Burn</Text>
      </View>
    </View>
  </TouchableOpacity>
);


const renderProgressItem = ({ item }: { item: ProgressItem }) => {
  const growth = calculateGrowth(item.startingBest, item.currentBest);
  
  return (
    <View style={styles.progressRow}>
      <Text style={styles.cell}>{item.exercise}</Text>
      <Text style={styles.cell}>{item.weight}</Text>
      <Text style={styles.cell}>{item.startingBest}</Text>
      <Text style={styles.cell}>{item.currentBest}</Text>
      <Text style={[styles.cell, styles.growthCell]}>{growth}</Text>
    </View>
  );
};

if (selectedExercise) {
  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setSelectedExercise(null)}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        <Text style={styles.backText}>Back to Exercises</Text>
      </TouchableOpacity>

      <Text style={styles.exerciseTitle}>{selectedExercise.name}</Text>

      <View style={styles.videoContainer}>
        <WebView
          javaScriptEnabled={true}
          allowsFullscreenVideo={true}
          source={{
          uri: `https://www.youtube.com/embed/${selectedExercise.videoId}?rel=0&autoplay=0&showinfo=0&controls=1`
        }}
         style={{ flex: 1 }}
  />
</View>

      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseDifficulty}>
          {selectedExercise.difficulty}
        </Text>
        <Text style={styles.exerciseCalories}>
          {' | '}
          {selectedExercise.calories} Calories Burn
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Descriptions</Text>
      <Text style={styles.descriptionText}>{selectedExercise.description}</Text>
      <Text style={styles.readMore}>Read More...</Text>

      <Text style={styles.sectionTitle}>
        How To Do It {selectedExercise.steps.length} Steps
      </Text>

      {selectedExercise.steps.map((step, index) => (
        <View key={index} style={styles.stepContainer}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>
              {index < 9 ? `0${index + 1}` : index + 1}
            </Text>
          </View>
          <Text style={styles.stepText}>● {step}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.aiCoachButton}>
        <MaterialCommunityIcons name="robot" size={24} color="white" />
        <Text style={styles.aiCoachText}>Analyze with AI Coach</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'exercise' && styles.activeTab]}
          onPress={() => setActiveTab('exercise')}
        >
          <Text style={styles.tabText}>Exercise</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'progress' && styles.activeTab]}
          onPress={() => setActiveTab('progress')}
        >
          <Text style={styles.tabText}>Progress</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'exercise' ? (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons
              name="magnify"
              size={24}
              color="#888"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity 
  style={styles.scanButton}
  onPress={() => navigation.navigate('AiCoach')}
>
  <MaterialCommunityIcons name="barcode-scan" size={24} color="white" />
</TouchableOpacity>
          </View>

          {/* Exercise List */}
          <FlatList
            data={filteredExercises}
            renderItem={renderExerciseItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.exerciseList}
          />
        </>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          {/* Chest Section */}
          <View style={styles.progressSection}>
            <Text style={styles.muscleGroupTitle}>Chest</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.progressScrollContainer}
            >
              <View style={styles.progressTable}>
                <View style={styles.progressHeaderRow}>
                  <Text style={[styles.headerCell, { flex: 1.2 }]}>Exercise</Text>
                  <Text style={styles.headerCell}>Weight</Text>
                  <Text style={styles.headerCell}>Start</Text>
                  <Text style={styles.headerCell}>Current</Text>
                  <Text style={styles.headerCell}>Growth</Text>
                </View>
                {progressData
                  .filter(item => item.category === 'Chest')
                  .map(item => (
                    <View key={item.id}>
                      {renderProgressItem({ item })}
                    </View>
                  ))}
              </View>
            </ScrollView>
          </View>

          {/* Legs Section */}
          <View style={styles.progressSection}>
            <Text style={styles.muscleGroupTitle}>Leg</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.progressScrollContainer}
            >
              <View style={styles.progressTable}>
                <View style={styles.progressHeaderRow}>
                  <Text style={[styles.headerCell, { flex: 1.2 }]}>Exercise</Text>
                  <Text style={styles.headerCell}>Weight</Text>
                  <Text style={styles.headerCell}>Start</Text>
                  <Text style={styles.headerCell}>Current</Text>
                  <Text style={styles.headerCell}>Growth</Text>
                </View>
                {progressData
                  .filter(item => item.category === 'Legs')
                  .map(item => (
                    <View key={item.id}>
                      {renderProgressItem({ item })}
                    </View>
                  ))}
              </View>
            </ScrollView>
          </View>

          {/* Biceps Section */}
          <View style={styles.progressSection}>
            <Text style={styles.muscleGroupTitle}>Biceps</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.progressScrollContainer}
            >
              <View style={styles.progressTable}>
                <View style={styles.progressHeaderRow}>
                  <Text style={[styles.headerCell, { flex: 1.2 }]}>Exercise</Text>
                  <Text style={styles.headerCell}>Weight</Text>
                  <Text style={styles.headerCell}>Start</Text>
                  <Text style={styles.headerCell}>Current</Text>
                  <Text style={styles.headerCell}>Growth</Text>
                </View>
                {progressData
                  .filter(item => item.category === 'Biceps')
                  .map(item => (
                    <View key={item.id}>
                      {renderProgressItem({ item })}
                    </View>
                  ))}
              </View>
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.addExerciseButton}>
            <Text style={styles.addExerciseText}>+ Add New Exercise</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c2e',
    paddingTop: 80,
  },
tabContainer: {
  flexDirection: 'row',
  marginHorizontal: 20,
  marginBottom: 15,
  borderRadius: 15,
  overflow: 'hidden',
  backgroundColor: '#2a2a3a',
  borderWidth: 1,
  borderColor: '#2a2a3a', // Purple border
},
tabButton: {
  flex: 1,
  paddingVertical: 15,
  alignItems: 'center',
  backgroundColor: 'transparent', // Make inactive tabs transparent
},
activeTab: {
  backgroundColor: '#5A3BFF', // Purple background for active tab
},
tabText: {
  color: '#ffffff', // Light gray for inactive tabs
  fontWeight: 'bold',
  fontSize: 16,
},
activeTabText: { // Add this new style
  color: 'white', // White text for active tab
},
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3a',
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    height: 50,
  },
  scanButton: {
    backgroundColor: '#5A556B',
    padding: 8,
    borderRadius: 8,
  },
  exerciseList: {
    paddingHorizontal: 20,
  },
  exerciseItem: {
    flexDirection: 'row',       // Horizontal layout
    alignItems: 'center',      // Center items vertically
    backgroundColor: '#2a2a3a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  exerciseName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  exerciseMeta: {
    flexDirection: 'row',
  },
  exerciseDifficulty: {
    color: '#4CAF50',
    fontSize: 14,
  },
  exerciseCalories: {
    color: '#888',
    fontSize: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  backText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
  },
  exerciseTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 5,
  },
  exerciseHeader: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  descriptionText: {
    color: '#aaa',
    marginHorizontal: 20,
    lineHeight: 22,
  },
  readMore: {
    color: '#5A556B',
    marginHorizontal: 20,
    marginTop: 5,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  stepNumber: {
    backgroundColor: '#5A556B',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumberText: {
    color: 'white',
    fontWeight: 'bold',
  },
  stepText: {
    color: 'white',
    flex: 1,
    lineHeight: 22,
  },
  aiCoachButton: {
    flexDirection: 'row',
    backgroundColor: '#5A556B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    marginTop: 30,
  },
  aiCoachText: {
    color: 'white',
    marginLeft: 10,
    fontWeight: 'bold',
    fontSize: 16,
  },
  progressContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#5A556B',
    paddingBottom: 10,
    marginBottom: 10,
  },
  progressHeaderText: {
    flex: 1,
    color: '#888',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  progressItem: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  progressExercise: {
    flex: 1,
    color: 'white',
    textAlign: 'center',
  },
  progressWeight: {
    flex: 1,
    color: 'white',
    textAlign: 'center',
  },
  progressStarting: {
    flex: 1,
    color: 'white',
    textAlign: 'center',
  },
  progressCurrent: {
    flex: 1,
    color: 'white',
    textAlign: 'center',
  },
  progressGrowth: {
    flex: 1,
    fontWeight: 'bold',
    textAlign: 'center',
  },
imageContainer: {
    width: 60,                // Fixed width for image
    height: 60,               // Fixed height for image
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 15,          // Space between image and text
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,                  // Takes remaining space
    flexDirection: 'column',  // Stack text vertically
    justifyContent: 'center', // Center text vertically
  },
   categoryContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#2a2a3a',
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#3a3a4a',
  },
  selectedCategoryButton: {
    backgroundColor: '#5A556B',
  },
  categoryText: {
    color: '#aaa',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 16,
  },
  videoContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    height: 220, // Fixed height for the video player
  },
   progressSection: {
    marginBottom: 25,
  },
  muscleGroupTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 20,
    marginBottom: 15,
  },
  progressScrollContainer: {
    paddingHorizontal: 15,
  },
  progressTable: {
    minWidth: Dimensions.get('window').width - 30,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#2a2a3a',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  headerCell: {
    flex: 1,
    color: '#888',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cell: {
    flex: 1,
    color: 'white',
    textAlign: 'center',
  },
  growthCell: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  addExerciseButton: {
    backgroundColor: '#5A3BFF',
    padding: 15,
    borderRadius: 10,
    margin: 20,
    alignItems: 'center',
  },
  addExerciseText: {
    color: 'white',
    fontWeight: 'bold',
  },
});



export default WorkoutScreen;

