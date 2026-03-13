import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../constants/theme";

type Props = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  isLive?: boolean;
  temporary?: boolean;
  distanceMiles?: number | null;
};

export default function BurgerVanCard({
  id,
  name,
  cuisine,
  rating,
  isLive,
  temporary,
  distanceMiles,
}: Props) {
  return (
    <Pressable
      onPress={() => router.push(`/vendor/${id}`)}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.accent} />

      <View style={styles.content}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{cuisine}</Text>

        <View style={styles.ratingRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.rating}>{rating.toFixed(1)}</Text>
        </View>
        {distanceMiles !== undefined && distanceMiles !== null ? (
          <Text style={styles.meta}>{distanceMiles.toFixed(1)} miles away</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 22,
    marginBottom: 16,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },

  accent: {
    width: 6,
    backgroundColor: theme.colors.primary,
  },

  content: {
    paddingVertical: 20,
    paddingHorizontal: 18,
    flex: 1,
  },

  name: {
    fontSize: 19,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 6,
  },

  meta: {
    fontSize: 15,
    color: theme.colors.muted,
    marginBottom: 14,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  star: {
    fontSize: 18,
    color: theme.colors.secondary,
    marginRight: 6,
  },

  rating: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary,
  },
});