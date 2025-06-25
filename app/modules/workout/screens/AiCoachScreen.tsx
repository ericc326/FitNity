import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AiCoachScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan Exercise</Text>
        <View style={{ width: 24 }} /> {/* Spacer for alignment */}
      </View>
      
      <View style={styles.scannerPlaceholder}>
        <MaterialCommunityIcons name="dumbbell" size={100} color="#5A3BFF" />
        <Text style={styles.placeholderText}>Exercise Scanner</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Cancel Scan</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c2e',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scannerPlaceholder: {
    flex: 1,
    backgroundColor: '#2a2a3a',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  placeholderText: {
    color: 'white',
    fontSize: 18,
    marginTop: 20,
  },
  button: {
    backgroundColor: '#5A3BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AiCoachScreen;