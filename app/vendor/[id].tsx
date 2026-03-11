import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { mockVans } from '../../constants/mockVans';

export default function VendorScreen() {
  const { id } = useLocalSearchParams();

  const van = mockVans.find((v) => v.id === id);

  if (!van) {
    return (
      <View style={styles.container}>
        <Text>Vendor not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{van.name}</Text>
      <Text style={styles.meta}>{van.cuisine}</Text>
      <Text style={styles.rating}>⭐ {van.rating}</Text>
      <Text style={styles.description}>
        This is where menu items, reviews and opening hours will appear.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4F2',
    padding: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
  },
  meta: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  rating: {
    fontSize: 18,
    color: '#E53935',
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: '#555',
  },
});
