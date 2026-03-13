import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { mockVans, type Van } from "../../constants/mockVans";

const CUSTOM_VANS_KEY = "bitebeacon_custom_vans";

export default function VendorScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;

  const [van, setVan] = useState<Van | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadVan();
    }, [id])
  );

  async function loadVan() {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_VANS_KEY);
      const customVans: Van[] = stored ? JSON.parse(stored) : [];

      const customMatch = customVans.find((item) => item.id === id);
      const mockMatch = mockVans.find((item) => item.id === id);

      if (customMatch) {
        const updatedVans = customVans.map((item) =>
          item.id === id
            ? { ...item, views: (item.views ?? 0) + 1 }
            : item
        );

        await AsyncStorage.setItem(CUSTOM_VANS_KEY, JSON.stringify(updatedVans));

        const updatedMatch =
          updatedVans.find((item) => item.id === id) ?? customMatch;

        setVan(updatedMatch);
        return;
      }

      if (mockMatch) {
        setVan(mockMatch);
        return;
      }

      if (params.name) {
        setVan({
          id,
          name: (params.name as string) ?? "Unknown vendor",
          cuisine: (params.cuisine as string) ?? "",
          vendorName: (params.vendorName as string) ?? "",
          menu: (params.menu as string) ?? "",
          schedule: (params.schedule as string) ?? "",
          rating: Number(params.rating ?? 0),
          lat: Number(params.lat ?? 0),
          lng: Number(params.lng ?? 0),
          temporary: params.temporary === "true",
          photo: (params.photo as string) || null,
          isLive: params.isLive === "true",
          views: 0,
          directions: 0,
        });
        return;
      }

      setVan(null);
    } catch {
      setVan(null);
    }
  }

  async function toggleLive() {
    if (!van) return;

    const newStatus = !van.isLive;

    if (van.id.startsWith("custom-")) {
      try {
        const stored = await AsyncStorage.getItem(CUSTOM_VANS_KEY);
        const vans: Van[] = stored ? JSON.parse(stored) : [];

        const updated = vans.map((item) =>
          item.id === van.id ? { ...item, isLive: newStatus } : item
        );

        await AsyncStorage.setItem(CUSTOM_VANS_KEY, JSON.stringify(updated));

        const updatedVan = updated.find((item) => item.id === van.id) ?? van;
        setVan(updatedVan);

        Alert.alert(newStatus ? "Vendor is now LIVE" : "Vendor is now OFFLINE");
      } catch {
        Alert.alert("Error updating vendor status");
      }

      return;
    }

    Alert.alert(
      "Editing locked",
      "This looks like a mock vendor. Only registered custom vendors can be edited."
    );
  }

  async function openDirections() {
    if (!van) return;

    if (van.id.startsWith("custom-")) {
      try {
        const stored = await AsyncStorage.getItem(CUSTOM_VANS_KEY);
        const vans: Van[] = stored ? JSON.parse(stored) : [];

        const updated = vans.map((item) =>
          item.id === van.id
            ? { ...item, directions: (item.directions ?? 0) + 1 }
            : item
        );

        await AsyncStorage.setItem(CUSTOM_VANS_KEY, JSON.stringify(updated));

        const updatedVan = updated.find((item) => item.id === van.id) ?? van;
        setVan(updatedVan);
      } catch { }
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${van.lat},${van.lng}`;
    Linking.openURL(mapsUrl);
  }

  if (!van) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Vendor not found</Text>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const canManage = van.id.startsWith("custom-");
  const canClaim = String(params.temporary) === "true";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {van.temporary ? `📍 ${van.name}` : van.name}
      </Text>

      <View style={styles.statusRow}>
        <Text style={styles.meta}>{van.cuisine}</Text>

        <Text
          style={[
            styles.statusBadge,
            van.temporary
              ? styles.statusOrange
              : van.isLive
                ? styles.statusGreen
                : styles.statusGray,
          ]}
        >
          {van.temporary ? "SPOTTED" : van.isLive ? "LIVE" : "OFFLINE"}
        </Text>
      </View>

      {van.photo ? <Image source={{ uri: van.photo }} style={styles.image} /> : null}

      <Text style={styles.sectionTitle}>Vendor</Text>
      <View style={styles.infoCard}>
        <Text style={styles.text}>{van.vendorName || "Unknown vendor"}</Text>
      </View>

      <Text style={styles.sectionTitle}>Menu</Text>
      <View style={styles.infoCard}>
        <Text style={styles.text}>{van.menu || "Menu coming soon"}</Text>
      </View>

      <Text style={styles.sectionTitle}>Schedule</Text>
      <View style={styles.infoCard}>
        <Text style={styles.text}>{van.schedule || "Schedule coming soon"}</Text>
      </View>

      <Text style={styles.sectionTitle}>Stats</Text>

      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Views</Text>
          <Text style={styles.statsValue}>{van.views ?? 0}</Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Directions</Text>
          <Text style={styles.statsValue}>{van.directions ?? 0}</Text>
        </View>
      </View>
      <Pressable
        style={[
          styles.liveButton,
          van.isLive ? styles.liveActive : styles.liveInactive,
        ]}
        onPress={toggleLive}
      >
        <Text style={styles.liveText}>
          {van.isLive ? "LIVE NOW" : "GO LIVE"}
        </Text>
      </Pressable>

      <Pressable style={styles.manageButton} onPress={openDirections}>
        <Text style={styles.manageButtonText}>Get Directions</Text>
      </Pressable>

      {canManage ? (
        <Pressable
          style={styles.manageButton}
          onPress={() =>
            router.push({
              pathname: "/vendor/dashboard",
              params: { id: van.id },
            })
          }
        >
          <Text style={styles.manageButtonText}>Manage Listing</Text>
        </Pressable>
      ) : null}

      {canClaim ? (
        <Pressable
          style={styles.manageButton}
          onPress={() =>
            router.push({
              pathname: "/vendor/register",
              params: {
                claimId: van.id,
                vanName: van.name,
                cuisine: van.cuisine,
                menu: van.menu ?? "",
                schedule: van.schedule ?? "",
                photo: van.photo ?? "",
                lat: String(van.lat),
                lng: String(van.lng),
              },
            })
          }
        >
          <Text style={styles.manageButtonText}>Claim This Van</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F4F2",
  },

  content: {
    padding: 24,
    paddingBottom: 40,
  },

  notFound: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 10,
    color: "#0B2A5B",
  },

  meta: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    marginBottom: 20,
    backgroundColor: "#EAEAEA",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 8,
    color: "#0B2A5B",
  },

  text: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
    marginBottom: 4,
  },

  liveButton: {
    marginTop: 30,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  liveActive: {
    backgroundColor: "#1DB954",
  },

  liveInactive: {
    backgroundColor: "#999",
  },

  liveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  manageButton: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#0B2A5B",
  },

  manageButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  backButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#D9D9D9",
  },

  backText: {
    fontWeight: "700",
    color: "#222222",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
  },

  statusGreen: {
    backgroundColor: "#1DB954",
  },

  statusGray: {
    backgroundColor: "#8C8C8C",
  },

  statusOrange: {
    backgroundColor: "#F39C12",
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D9D9D9",
    marginTop: 6,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },

  statsLabel: {
    fontSize: 14,
    color: "#5F6368",
    fontWeight: "600",
  },

  statsValue: {
    fontSize: 16,
    color: "#0B2A5B",
    fontWeight: "800",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D9D9D9",
    marginTop: 4,
  },
});