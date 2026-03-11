import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
};

export default function BurgerVanCard({
  id,
  name,
  cuisine,
  rating,
}: Props) {
  return (
    <Pressable
      onPress={() => router.push(`/vendor/${id}`)}
      style={styles.card}
    >
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.meta}>{cuisine}</Text>
      <Text style={styles.rating}>⭐ {rating}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    fontSize: 14,
    color: '#666',
  },
  rating: {
    fontSize: 14,
    color: '#E53935',
    marginTop: 6,
  },
});
