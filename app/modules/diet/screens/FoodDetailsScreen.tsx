import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { DietStackParamList } from '../navigation/DietNavigator';
import { Ionicons } from '@expo/vector-icons';

type FoodDetailsRouteProp = RouteProp<DietStackParamList, 'FoodDetails'>;

const FoodDetailsScreen = ({ route }: { route: FoodDetailsRouteProp }) => {
  const { food } = route.params;
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
      </View>

      <ScrollView>
        {/* Food Image */}
        <Image source={food.image} style={styles.image} />

        {/* Content Container with Dark Background */}
        <View style={styles.contentContainer}>
          {/* Title and Author */}
          <Text style={styles.title}>{food.name}</Text>
          <Text style={styles.author}>By James Ruth</Text>

          {/* Nutrition Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition</Text>
            <View style={styles.nutritionRow}>
              <Text style={styles.calories}>{food.nutrition.calories}</Text>
              <View style={styles.nutritionDetails}>
                <Text style={styles.nutritionText}>• {food.nutrition.fat} fat</Text>
                <Text style={styles.nutritionText}>• {food.nutrition.protein} protein</Text>
              </View>
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              Pancakes are some people's favorite breakfast, who doesn't like pancakes? 
              Especially with the real honey splash on top of the pancakes, of course 
              everyone loves that! Besides being...
            </Text>
            <Text style={styles.readMore}>Read More...</Text>
          </View>

          {/* Ingredients Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients That You Will Need</Text>
            <View style={styles.ingredientsGrid}>
              <View style={styles.ingredientItem}>
                <Text style={styles.ingredientName}>Wheat flour</Text>
                <Text style={styles.ingredientAmount}>100gr</Text>
              </View>
              <View style={styles.ingredientItem}>
                <Text style={styles.ingredientName}>Sugar</Text>
                <Text style={styles.ingredientAmount}>3 tbsp</Text>
              </View>
              <View style={styles.ingredientItem}>
                <Text style={styles.ingredientName}>Baking Soda</Text>
                <Text style={styles.ingredientAmount}>2 tsp</Text>
              </View>
              <View style={styles.ingredientItem}>
                <Text style={styles.ingredientName}>Eggs</Text>
                <Text style={styles.ingredientAmount}>2 items</Text>
              </View>
            </View>
          </View>

          {/* Steps Section */}
          <View style={styles.section}>
            <View style={styles.stepsHeader}>
              <Text style={styles.sectionTitle}>Step by Step</Text>
              <Text style={styles.stepCount}>8 Steps</Text>
            </View>
            {[1, 2, 3].map((step) => (
              <View key={step} style={styles.stepContainer}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.toString().padStart(2, '0')}</Text>
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>Step {step}</Text>
                  <Text style={styles.stepDescription}>
                    {step === 1 && 'Prepare all of the ingredients that needed'}
                    {step === 2 && 'Mix flour, sugar, salt, and baking powder'}
                    {step === 3 && 'In a separate place, mix the eggs and liquid milk until blended'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#262135',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
  },
  image: {
    width: '100%',
    height: 300,
  },
  contentContainer: {
    backgroundColor: '#262135',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  author: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 25,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  calories: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5A3BFF',
    marginRight: 20,
  },
  nutritionDetails: {
    flex: 1,
  },
  nutritionText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
    marginBottom: 10,
  },
  readMore: {
    color: '#5A3BFF',
    fontSize: 14,
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ingredientItem: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  ingredientAmount: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  stepCount: {
    fontSize: 14,
    color: '#666666',
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5A3BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  stepDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
});

export default FoodDetailsScreen;