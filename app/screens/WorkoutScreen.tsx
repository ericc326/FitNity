import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const WorkoutScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Workout Screen</Text>
    </View>
  );
};

export default WorkoutScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
});
