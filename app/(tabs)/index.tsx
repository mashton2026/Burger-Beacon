import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import BurgerVanCard from "../../components/BurgerVanCard";
import { mockVans, type Van } from "../../constants/mockVans";
import { theme } from "../../constants/theme";

const CUSTOM_VANS_KEY = "bitebeacon_custom_vans";

function getDistanceMiles(
  userLat: number,
  userLng: number,
  vanLat: number,
  vanLng: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(vanLat - userLat);
  const dLng = toRad(vanLng - userLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(userLat)) *
    Math.cos(toRad(vanLat)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = earthRadiusKm * c;

  return distanceKm * 0.621371;
}

export default function HomeScreen() {
  const [customVans, setCustomVans] = useState<Van[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [sortMode, setSortMode] = useState<"live" | "rating">("live");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    requestUserLocation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustomVans();
    }, [])
  );

  async function loadCustomVans() {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_VANS_KEY);

      if (!stored) {
        setCustomVans([]);
        return;
      }

      const parsed: Van[] = JSON.parse(stored);
      setCustomVans(parsed);
    } catch {
      setCustomVans([]);
    }
  }

  async function requestUserLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        return;
      }

      const current = await Location.getCurrentPositionAsync({});

      setUserLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch { }
  }

  const allVans: Van[] = [...mockVans, ...customVans];

  const cuisineOptions = ["All", "LIVE NOW", "Burgers", "Smash Burgers", "BBQ"];

  const filteredVans = (
    selectedFilter === "All"
      ? allVans
      : selectedFilter === "LIVE NOW"
        ? allVans.filter((van) => van.isLive)
        : allVans.filter((van) => van.cuisine === selectedFilter)
  ).sort((a, b) => {
    if (sortMode === "live") {
      if (a.isLive !== b.isLive) {
        return a.isLive ? -1 : 1;
      }

      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }

      return a.name.localeCompare(b.name);
    }

    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }

    if (a.isLive !== b.isLive) {
      return a.isLive ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });

  const featuredVans = filteredVans.filter((van) => van.isLive).slice(0, 3);

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredVans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logo}
                resizeMode="cover"
              />

              <LinearGradient
                colors={["rgba(11,42,91,0)", theme.colors.background]}
                style={styles.fade}
              />
            </View>

            <View style={styles.filterRow}>
              {cuisineOptions.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.filterChip,
                    selectedFilter === option && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedFilter(option)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === option &&
                      styles.filterChipTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.filterRow}>
              <Pressable
                style={[
                  styles.filterChip,
                  sortMode === "live" && styles.filterChipActive,
                ]}
                onPress={() => setSortMode("live")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    sortMode === "live" && styles.filterChipTextActive,
                  ]}
                >
                  Live First
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.filterChip,
                  sortMode === "rating" && styles.filterChipActive,
                ]}
                onPress={() => setSortMode("rating")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    sortMode === "rating" && styles.filterChipTextActive,
                  ]}
                >
                  Top Rated
                </Text>
              </Pressable>
            </View>

            {featuredVans.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>⭐ Featured vendors</Text>
                  <Text style={styles.sectionSubtitle}>
                    Top live vendors near you
                  </Text>
                </View>

                {featuredVans.map((item) => (
                  <BurgerVanCard
                    key={`featured-${item.id}`}
                    id={item.id}
                    name={item.name}
                    cuisine={item.cuisine}
                    rating={item.rating}
                    isLive={item.isLive}
                    temporary={item.temporary}
                    distanceMiles={
                      userLocation
                        ? getDistanceMiles(
                          userLocation.latitude,
                          userLocation.longitude,
                          item.lat,
                          item.lng
                        )
                        : null
                    }
                  />
                ))}
              </>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby vendors</Text>
              <Text style={styles.sectionSubtitle}>
                Discover all vendors ranked by {sortMode === "live" ? "live status and rating" : "rating"}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No vendors found</Text>
            <Text style={styles.emptyStateText}>
              Try another filter or check back when more vans are live.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <BurgerVanCard
            id={item.id}
            name={item.name}
            cuisine={item.cuisine}
            rating={item.rating}
            isLive={item.isLive}
            temporary={item.temporary}
            distanceMiles={
              userLocation
                ? getDistanceMiles(
                  userLocation.latitude,
                  userLocation.longitude,
                  item.lat,
                  item.lng
                )
                : null
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  hero: {
    width: "100%",
    height: 240,
    marginBottom: 18,
    position: "relative",
    overflow: "hidden",
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  fade: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  filterChip: {
    backgroundColor: "#2C4875",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },

  filterChipActive: {
    backgroundColor: "#FFFFFF",
  },

  filterChipText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  filterChipTextActive: {
    color: "#0B2A5B",
  },

  sectionHeader: {
    marginTop: 8,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  sectionSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  emptyStateText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
});