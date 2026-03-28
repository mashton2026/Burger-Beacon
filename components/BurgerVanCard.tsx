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
  subscriptionTier?: "free" | "growth" | "pro";
  vendorMessage?: string;
};

export default function BurgerVanCard({
  id,
  name,
  cuisine,
  rating,
  isLive,
  temporary,
  distanceMiles,
  subscriptionTier,
  vendorMessage,
}: Props) {
  const statusText = temporary
    ? "SPOTTED"
    : isLive
      ? "LIVE"
      : subscriptionTier === "pro"
        ? "FEATURED"
        : "LISTED";

  return (
    <Pressable
      onPress={() => router.push(`/vendor/${id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.glowOrb} />
      <View style={styles.topAccentLine} />

      <View style={styles.headerRow}>
        <View style={styles.leftBadges}>
          {subscriptionTier === "pro" ? (
            <View style={[styles.badge, styles.featuredBadge]}>
              <Text style={styles.badgeText}>FEATURED</Text>
            </View>
          ) : subscriptionTier === "growth" ? (
            <View style={[styles.badge, styles.growthBadge]}>
              <Text style={styles.badgeText}>GROWTH</Text>
            </View>
          ) : null}

          {!!vendorMessage?.trim() ? (
            <View style={[styles.badge, styles.dealBadge]}>
              <Text style={styles.badgeText}>DEAL</Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.statusPill,
            temporary
              ? styles.statusSpotted
              : isLive
                ? styles.statusLive
                : styles.statusListed,
          ]}
        >
          <Text style={styles.statusPillText}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>

        <Text style={styles.meta} numberOfLines={1}>
          {cuisine}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.infoPill}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.infoPillText}>{rating.toFixed(1)}</Text>
          </View>

          {distanceMiles !== undefined && distanceMiles !== null ? (
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>
                {distanceMiles.toFixed(1)} mi
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F9FBFF",
    borderRadius: 20,
    marginBottom: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "rgba(255,122,0,0.35)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  cardPressed: {
    opacity: 0.97,
    transform: [{ scale: 0.995 }],
  },

  glowOrb: {
    position: "absolute",
    top: -24,
    right: -18,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,122,0,0.10)",
  },

  topAccentLine: {
    height: 5,
    backgroundColor: theme.colors.primary,
  },

  headerRow: {
    paddingTop: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  leftBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  featuredBadge: {
    backgroundColor: theme.colors.primary,
  },

  growthBadge: {
    backgroundColor: theme.colors.background,
  },

  dealBadge: {
    backgroundColor: theme.colors.success,
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusLive: {
    backgroundColor: "rgba(29,185,84,0.14)",
  },

  statusListed: {
    backgroundColor: "rgba(11,42,91,0.10)",
  },

  statusSpotted: {
    backgroundColor: "rgba(255,122,0,0.14)",
  },

  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.background,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },

  name: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.background,
    marginBottom: 6,
  },

  meta: {
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 12,
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(11,42,91,0.08)",
  },

  star: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginRight: 6,
  },

  infoPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.background,
  },
});