import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DietScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Diet Screen</Text>
    </View>
  );
};

export default DietScreen;

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
