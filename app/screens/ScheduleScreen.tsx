import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ScheduleScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Schedule Screen</Text>
    </View>
  );
};

export default ScheduleScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#262135',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
});
