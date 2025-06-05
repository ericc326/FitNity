import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';

const challenges = [
  { id: '1', title: 'Move more challenge' },
  { id: '2', title: 'Run challenge' },
  { id: '3', title: 'Bumpee challenge' },
  { id: '4', title: 'Squat challenge' },
];

const ChallengesTab = () => {
  return (
    <FlatList
      data={challenges}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1599058917212-dc7e845ab4c2' }}
            style={styles.image}
          />
          <View style={styles.info}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.details}>9 days to go</Text>
            <Text style={styles.details}>10 participants</Text>
            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
};

export default ChallengesTab;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 8,
  },
  info: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  details: {
    color: '#aaa',
    marginTop: 4,
  },
  viewButton: {
    backgroundColor: '#2f80ed',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  viewText: {
    color: '#fff',
  },
});
