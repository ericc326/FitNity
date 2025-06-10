import React from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';

const mockPosts = [
  {
    id: '1',
    user: 'Zepennlin',
    time: '9 h',
    text: 'Here is my diet for today, stay healthy and fit',
    image:
      'https://images.unsplash.com/photo-1606755962773-512cf5b6838c', // Sample salmon image
  },
  {
    id: '2',
    user: 'Daniel',
    time: '2 d',
    text: 'Today done the challenge of Burpee',
    image:
      'https://images.unsplash.com/photo-1608231387042-66d1773070a7', // Sample workout
  },
];

const FeedTab = () => {
  return (
    <FlatList
      data={mockPosts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.post}>
          <Text style={styles.user}>{item.user}</Text>
          <Text style={styles.time}>{item.time}</Text>
          <Text style={styles.text}>{item.text}</Text>
          <Image source={{ uri: item.image }} style={styles.image} />
        </View>
      )}
    />
  );
};

export default FeedTab;

const styles = StyleSheet.create({
  post: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  user: {
    fontWeight: 'bold',
    color: '#fff',
  },
  time: {
    color: '#aaa',
  },
  text: {
    color: '#eee',
    marginVertical: 8,
  },
  image: {
    height: 200,
    borderRadius: 10,
  },
});
