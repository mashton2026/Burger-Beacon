import * as Location from "expo-location";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { MapPressEvent, Marker, Region } from "react-native-maps";

import markerFeatured from "../../assets/markers/marker-featured.png";
import markerLive from "../../assets/markers/marker-live.png";
import markerOffline from "../../assets/markers/marker-offline.png";
import markerSpotted from "../../assets/markers/marker-spotted.png";
import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import { getCurrentUser } from "../../services/authService";
import { createVendor, getAllVendors } from "../../services/vendorService";
import { type Van } from "../../types/van";

type SpotPin = {
  latitude: number;
  longitude: number;
};

type FilterType = "all" | "live" | "spotted";

const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const BITEBEACON_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#eaf0f6" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#355070" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cfd8e3" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#f6efe8" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#dfeee1" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#dbe4ef" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#fff7ef" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#ffe4cc" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#ffb979" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#e5eaf0" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#bfd8f5" }],
  },
];

function getMarkerImage(van: Van) {
  if (van.listingSource === "user_spotted") return markerSpotted;
  if (van.subscriptionTier === "pro") return markerFeatured;
  if (van.owner_id && van.isLive) return markerLive;
  return markerOffline;
}

function getStatusLabel(van: Van) {
  if (van.listingSource === "user_spotted") return "SPOTTED";
  if (getSubscriptionFeatures(van.subscriptionTier).liveStatus) {
    return van.isLive ? "LIVE" : "LISTED";
  }

  return "LISTED";
}

function getCardImage(van: Van) {
  if (van.logoUrl) return van.logoUrl;

  const safePhotos = Array.isArray(van.photos) ? van.photos : [];

  if (safePhotos.length > 0) {
    return safePhotos[0];
  }

  return van.photo ?? null;
}

function matchesSearchQuery(van: Van, query: string) {
  const search = query.trim().toLowerCase();

  if (!search) return true;

  return (
    van.name.toLowerCase().includes(search) ||
    (van.vendorName ?? "").toLowerCase().includes(search) ||
    van.cuisine.toLowerCase().includes(search) ||
    (van.foodCategories ?? []).some((category) =>
      category.toLowerCase().includes(search)
    )
  );
}

export default function MapScreen() {
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView | null>(null);
  const hasAnimatedToUserLocation = useRef(false);

  const [spotVisible, setSpotVisible] = useState(false);
  const [spotMode, setSpotMode] = useState(false);
  const [spotName, setSpotName] = useState("");
  const [spotCuisine, setSpotCuisine] = useState("");
  const [supabaseVans, setSupabaseVans] = useState<Van[]>([]);
  const [selectedSpotPin, setSelectedSpotPin] = useState<SpotPin | null>(null);
  const [selectedVan, setSelectedVan] = useState<Van | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRegion, setUserRegion] = useState<Region>(DEFAULT_REGION);
  const [legendOpen, setLegendOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const selectedMarkerScale = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    requestUserLocation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSupabaseVans();
    }, [])
  );

  useEffect(() => {
    const parsedLat = Number(params.lat);
    const parsedLng = Number(params.lng);

    if (
      params.lat &&
      params.lng &&
      !Number.isNaN(parsedLat) &&
      !Number.isNaN(parsedLng)
    ) {
      const nextRegion: Region = {
        latitude: parsedLat,
        longitude: parsedLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setUserRegion(nextRegion);

      if (mapReady) {
        mapRef.current?.animateToRegion(nextRegion, 700);
      }
      return;
    }

    if (!params.highlight) return;

    const highlightedVendor = supabaseVans.find(
      (van) => van.id === params.highlight
    );

    if (!highlightedVendor) return;

    setSelectedVan(highlightedVendor);
    setSpotMode(false);
    setSelectedSpotPin(null);

    const nextRegion: Region = {
      latitude: highlightedVendor.lat,
      longitude: highlightedVendor.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setUserRegion(nextRegion);

    if (mapReady) {
      mapRef.current?.animateToRegion(nextRegion, 700);
    }
  }, [params.lat, params.lng, params.highlight, supabaseVans, mapReady]);

  useEffect(() => {
    if (!selectedVan) {
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 20,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.spring(selectedMarkerScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 120,
      }).start();

      return;
    }

    selectedMarkerScale.setValue(0.9);

    Animated.spring(selectedMarkerScale, {
      toValue: 1.12,
      useNativeDriver: true,
      friction: 5,
      tension: 140,
    }).start();

    cardOpacity.setValue(0);
    cardTranslateY.setValue(20);

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
        tension: 110,
      }),
    ]).start();
  }, [selectedVan, cardOpacity, cardTranslateY, selectedMarkerScale]);

  async function requestUserLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        return;
      }

      const current = await Location.getCurrentPositionAsync({});

      const nextRegion: Region = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setUserRegion(nextRegion);

      if (mapReady && !hasAnimatedToUserLocation.current) {
        mapRef.current?.animateToRegion(nextRegion, 600);
        hasAnimatedToUserLocation.current = true;
      }
    } catch {
      // keep default region
    }
  }

  async function loadSupabaseVans() {
    try {
      const vendors = await getAllVendors();
      setSupabaseVans(vendors);
    } catch {
      setSupabaseVans([]);
    }
  }

  const liveVendorCount = useMemo(() => {
    return supabaseVans.filter((van) => van.isLive && !van.temporary).length;
  }, [supabaseVans]);

  const filteredVans = useMemo(() => {
    const baseVans =
      selectedFilter === "live"
        ? supabaseVans.filter((van) => van.isLive && !van.temporary)
        : selectedFilter === "spotted"
          ? supabaseVans.filter((van) => van.temporary)
          : supabaseVans;

    const searchedVans = searchQuery.trim()
      ? baseVans.filter((van) => matchesSearchQuery(van, searchQuery))
      : baseVans;

    return [...searchedVans].sort((a, b) => {
      const tierRank = { pro: 3, growth: 2, free: 1 };

      const aRank = tierRank[a.subscriptionTier ?? "free"];
      const bRank = tierRank[b.subscriptionTier ?? "free"];

      if (aRank !== bRank) {
        return bRank - aRank;
      }

      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;

      return b.rating - a.rating;
    });
  }, [supabaseVans, selectedFilter, searchQuery]);

  useEffect(() => {
    if (!selectedVan) return;

    const stillVisible = filteredVans.some((van) => van.id === selectedVan.id);

    if (!stillVisible) {
      setSelectedVan(null);
    }
  }, [filteredVans, selectedVan]);

  function handleMarkerPress(van: Van) {
    setSelectedVan(van);
    setSpotMode(false);
    setSelectedSpotPin(null);

    mapRef.current?.animateToRegion(
      {
        latitude: van.lat,
        longitude: van.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      400
    );
  }

  function handleMapPress(event: MapPressEvent) {
    if (spotMode) {
      const { latitude, longitude } = event.nativeEvent.coordinate;

      setSelectedSpotPin({ latitude, longitude });
      setSelectedVan(null);
      setSpotMode(false);
      setSpotVisible(true);

      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        350
      );

      return;
    }

    setSelectedVan(null);
    setSelectedSpotPin(null);
  }

  async function startSpotMode() {
    const user = await getCurrentUser();

    if (!user) {
      Alert.alert(
        "Login required",
        "Please log in or create an account before spotting a van."
      );
      return;
    }

    setSelectedVan(null);
    setSpotMode(true);
    setSelectedSpotPin(null);

    Alert.alert("Choose location", "Tap the map where the van is located.");
  }

  function cancelSpotFlow() {
    setSpotMode(false);
    setSpotVisible(false);
    setSpotName("");
    setSpotCuisine("");
    setSelectedSpotPin(null);
  }

  async function submitSpotVan() {
    if (!spotName.trim()) {
      Alert.alert("Missing name", "Please enter the van name.");
      return;
    }

    if (!selectedSpotPin) {
      Alert.alert("Missing location", "Please choose a location.");
      return;
    }

    const user = await getCurrentUser();

    if (!user) {
      Alert.alert(
        "Login required",
        "Please log in or create an account before spotting a van."
      );
      return;
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const newVan: Van = {
      id: `spotted-${Date.now()}`,
      name: spotName.trim(),
      cuisine: spotCuisine.trim() || "Spotted Van",
      rating: 0,
      lat: selectedSpotPin.latitude,
      lng: selectedSpotPin.longitude,
      temporary: true,
      listingSource: "user_spotted",
      photo: null,
      vendorName: "Community spotted",
      menu: "Claim this van to add menu",
      schedule: "Claim to add schedule",
      isLive: false,
      views: 0,
      directions: 0,
      owner_id: null,
      subscriptionTier: "free",
      foodCategories: [],
    };

    try {

      await createVendor({
        id: newVan.id,
        name: newVan.name,
        vendorName: newVan.vendorName ?? "Community spotted",
        cuisine: newVan.cuisine,
        menu: newVan.menu ?? "Claim this van to add menu",
        schedule: newVan.schedule ?? "Claim to add schedule",
        lat: newVan.lat,
        lng: newVan.lng,
        photo: null,
        temporary: true,
        listingSource: "user_spotted",
        expiresAt,
        isLive: false,
        owner_id: null,
        views: 0,
        directions: 0,
        rating: 0,
        subscriptionTier: "free",
        foodCategories: [],
      });

      await loadSupabaseVans();
      setSelectedVan(null);
      cancelSpotFlow();
      Alert.alert("Success", "Spotted van added to the BiteBeacon map.");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Could not save spotted van."
      );
    }
  }

  function openVanPage(van: Van) {
    router.push({
      pathname: "/vendor/[id]",
      params: { id: van.id },
    });
  }

  function recenterMap() {
    setSelectedVan(null);
    setSelectedSpotPin(null);
    mapRef.current?.animateToRegion(userRegion, 600);
  }

  function closeSearch() {
    setSearchQuery("");
    setSearchVisible(false);
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={BITEBEACON_MAP_STYLE}
        onPress={handleMapPress}
        onMapReady={() => {
          setMapReady(true);

          if (!hasAnimatedToUserLocation.current) {
            mapRef.current?.animateToRegion(userRegion, 450);
            hasAnimatedToUserLocation.current = true;
          }
        }}
      >
        {filteredVans.map((van) => {
          const isSelected = selectedVan?.id === van.id;

          return (
            <Marker
              key={van.id}
              coordinate={{ latitude: van.lat, longitude: van.lng }}
              onPress={() => handleMarkerPress(van)}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: isSelected
                        ? selectedMarkerScale
                        : van.isLive
                          ? 1.15
                          : 1,
                    },
                  ],
                }}
              >
                <Image
                  source={getMarkerImage(van)}
                  style={[
                    styles.markerImage,
                    van.isLive && {
                      shadowColor: "#1DB954",
                      shadowOpacity: 0.8,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 0 },
                    },
                  ]}
                  resizeMode="contain"
                />
              </Animated.View>
            </Marker>
          );
        })}

        {selectedSpotPin ? (
          <Marker coordinate={selectedSpotPin}>
            <Image
              source={markerSpotted}
              style={styles.markerImage}
              resizeMode="contain"
            />
          </Marker>
        ) : null}
      </MapView>

      {!mapReady ? (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      ) : null}

      <View style={styles.topOverlay}>
        <View style={styles.topControlsRow}>
          <View style={styles.filterBar}>
            <Pressable
              style={[
                styles.filterChip,
                selectedFilter === "all" && styles.filterChipActive,
              ]}
              onPress={() => {
                setSelectedFilter("all");
                setSelectedVan(null);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === "all" && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.filterChip,
                selectedFilter === "live" && styles.filterChipActive,
              ]}
              onPress={() => {
                setSelectedFilter("live");
                setSelectedVan(null);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === "live" && styles.filterChipTextActive,
                ]}
              >
                Live ({liveVendorCount})
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.filterChip,
                selectedFilter === "spotted" && styles.filterChipActive,
              ]}
              onPress={() => {
                setSelectedFilter("spotted");
                setSelectedVan(null);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === "spotted" && styles.filterChipTextActive,
                ]}
              >
                Spotted
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.searchIconButton}
            onPress={() => {
              if (searchVisible) {
                closeSearch();
              } else {
                setSearchVisible(true);
              }
            }}
          >
            <Text style={styles.searchIconText}>
              {searchVisible ? "✕" : "🔍"}
            </Text>
          </Pressable>
        </View>

        {searchVisible ? (
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search vendor or cuisine"
              placeholderTextColor="rgba(0,0,0,0.45)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        ) : null}

        {!legendOpen ? (
          <Pressable
            style={styles.legendButton}
            onPress={() => setLegendOpen(true)}
          >
            <Text style={styles.legendButtonText}>Map Guide</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.legendCard}
            onPress={() => setLegendOpen(false)}
          >
            <View style={styles.legendItem}>
              <Image
                source={markerFeatured}
                style={styles.legendMarkerImage}
                resizeMode="contain"
              />
              <Text style={styles.legendText}>Featured</Text>
            </View>

            <View style={styles.legendItem}>
              <Image
                source={markerLive}
                style={styles.legendMarkerImage}
                resizeMode="contain"
              />
              <Text style={styles.legendText}>Live now</Text>
            </View>

            <View style={styles.legendItem}>
              <Image
                source={markerSpotted}
                style={styles.legendMarkerImage}
                resizeMode="contain"
              />
              <Text style={styles.legendText}>Community spotted</Text>
            </View>

            <View style={styles.legendItemLast}>
              <Image
                source={markerOffline}
                style={styles.legendMarkerImage}
                resizeMode="contain"
              />
              <Text style={styles.legendText}>Listed / offline</Text>
            </View>
          </Pressable>
        )}
      </View>

      {spotMode ? (
        <View style={styles.spotInstructionWrap}>
          <Text style={styles.spotInstructionTitle}>Spot Mode Active</Text>
          <Text style={styles.spotInstructionText}>
            Tap the map to place the van location.
          </Text>
        </View>
      ) : null}

      <Pressable style={styles.recenterButton} onPress={recenterMap}>
        <Text style={styles.recenterButtonText}>📍</Text>
      </Pressable>

      {selectedVan ? (
        <Animated.View
          style={[
            styles.bottomCardWrap,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          <Pressable
            style={styles.bottomCard}
            onPress={() => openVanPage(selectedVan)}
          >
            <View style={styles.bottomCardTopRow}>
              <View style={styles.bottomCardInfoRow}>
                {getCardImage(selectedVan) ? (
                  <Image
                    source={{ uri: getCardImage(selectedVan)! }}
                    style={styles.bottomCardImage}
                  />
                ) : null}

                <View style={styles.bottomCardTitleBlock}>
                  <View style={styles.bottomCardTitleRow}>
                    <Text style={styles.bottomCardTitle}>{selectedVan.name}</Text>

                    {selectedVan.owner_id && !selectedVan.temporary ? (
                      <View style={styles.bottomCardFeaturedBadge}>
                        <Text style={styles.bottomCardFeaturedBadgeText}>
                          VERIFIED
                        </Text>
                      </View>
                    ) : null}

                    {selectedVan.subscriptionTier === "pro" ? (
                      <View style={styles.bottomCardFeaturedBadge}>
                        <Text style={styles.bottomCardFeaturedBadgeText}>
                          FEATURED
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.bottomCardMeta}>{selectedVan.cuisine}</Text>

                  <Text style={styles.bottomCardTrustText}>
                    {selectedVan.listingSource === "user_spotted"
                      ? "Community spotted listing"
                      : "Vendor-managed listing"}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusPill,
                  selectedVan.temporary
                    ? styles.statusTemporary
                    : selectedVan.isLive
                      ? styles.statusLive
                      : selectedVan.subscriptionTier === "pro"
                        ? styles.statusFeatured
                        : styles.statusOffline,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    selectedVan.subscriptionTier === "pro" &&
                    !selectedVan.temporary &&
                    !selectedVan.isLive &&
                    styles.statusPillTextFeatured,
                  ]}
                >
                  {getStatusLabel(selectedVan)}
                </Text>
              </View>
            </View>

            <View style={styles.bottomCardStatsRow}>
              <View style={styles.bottomCardStatPill}>
                <Text style={styles.bottomCardStatLabel}>Rating</Text>
                <Text style={styles.bottomCardStatValue}>
                  {selectedVan.rating.toFixed(1)}
                </Text>
              </View>

              <View style={styles.bottomCardStatPill}>
                <Text style={styles.bottomCardStatLabel}>Views</Text>
                <Text style={styles.bottomCardStatValue}>
                  {selectedVan.views ?? 0}
                </Text>
              </View>
            </View>

            <View style={styles.bottomCardFooter}>
              <Text style={styles.bottomCardHint}>
                {selectedVan.temporary
                  ? "Tap to learn more about this spotted van"
                  : "Tap to open vendor details"}
              </Text>

              <View style={styles.bottomCardActionPill}>
                <Text style={styles.bottomCardActionPillText}>Open</Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      <View style={styles.buttonWrap}>
        <Pressable style={styles.primaryButton} onPress={startSpotMode}>
          <Text style={styles.primaryButtonText}>Spot a Van</Text>
        </Pressable>
      </View>

      {spotVisible ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Spot a Van</Text>
              <Text style={styles.modalSubtitle}>
                Add a temporary spotted van for the community.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Van name"
                placeholderTextColor="#7A7A7A"
                value={spotName}
                onChangeText={setSpotName}
              />

              <TextInput
                style={styles.input}
                placeholder="Cuisine"
                placeholderTextColor="#7A7A7A"
                value={spotCuisine}
                onChangeText={setSpotCuisine}
              />

              <Pressable style={styles.primaryButton} onPress={submitSpotVan}>
                <Text style={styles.primaryButtonText}>Submit Listing</Text>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={cancelSpotFlow}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B2A5B",
  },

  map: {
    flex: 1,
  },

  markerImage: {
    width: 40,
    height: 52,
  },

  legendMarkerImage: {
    width: 36,
    height: 48,
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,42,91,0.08)",
    pointerEvents: "none",
  },

  loadingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    backgroundColor: "rgba(11,42,91,0.76)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },

  topOverlay: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    zIndex: 10,
  },

  topControlsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },

  filterBar: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
    flexWrap: "wrap",
  },

  searchRow: {
    marginBottom: 10,
  },

  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#FF7A00",
    color: "#222222",
    fontWeight: "600",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  searchIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FF7A00",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  searchIconText: {
    fontSize: 20,
  },

  filterChip: {
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.35)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  filterChipActive: {
    backgroundColor: "#0B2A5B",
    borderColor: "#FF7A00",
  },

  filterChipText: {
    color: "#0B2A5B",
    fontWeight: "800",
    fontSize: 14,
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  legendButton: {
    alignSelf: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#FF7A00",
  },

  legendButtonText: {
    color: "#0B2A5B",
    fontWeight: "800",
    fontSize: 12,
  },

  legendCard: {
    alignSelf: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: "#FF7A00",
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },

  legendItemLast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  legendText: {
    color: "#0B2A5B",
    fontWeight: "700",
    fontSize: 12,
  },

  spotInstructionWrap: {
    position: "absolute",
    top: 164,
    left: 16,
    right: 16,
    backgroundColor: "rgba(11,42,91,0.96)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#FF7A00",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  spotInstructionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },

  spotInstructionText: {
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "600",
  },

  recenterButton: {
    position: "absolute",
    right: 16,
    bottom: 218,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FF7A00",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  recenterButtonText: {
    fontSize: 20,
  },

  buttonWrap: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    gap: 10,
  },

  primaryButton: {
    backgroundColor: "#0B2A5B",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FF7A00",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },

  bottomCardWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 100,
  },

  bottomCard: {
    backgroundColor: "rgba(11,42,91,0.96)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: "#FF7A00",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  bottomCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  bottomCardInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },

  bottomCardImage: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#FF7A00",
  },

  bottomCardTitleBlock: {
    flex: 1,
  },

  bottomCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },

  bottomCardTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  bottomCardFeaturedBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  bottomCardFeaturedBadgeText: {
    color: "#FF7A00",
    fontSize: 10,
    fontWeight: "800",
  },

  bottomCardMeta: {
    fontSize: 15,
    color: "rgba(255,255,255,0.88)",
    fontWeight: "700",
    marginBottom: 2,
  },

  bottomCardTrustText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.68)",
    fontWeight: "700",
  },

  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },

  statusPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  statusPillTextFeatured: {
    color: "#0B2A5B",
  },

  statusLive: {
    backgroundColor: "#1DB954",
  },

  statusOffline: {
    backgroundColor: "#888888",
  },

  statusTemporary: {
    backgroundColor: "#FF7A00",
  },

  statusFeatured: {
    backgroundColor: "#FFFFFF",
  },

  bottomCardStatsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },

  bottomCardStatPill: {
    width: "46%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  bottomCardStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.68)",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  bottomCardStatValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  bottomCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  bottomCardHint: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  bottomCardActionPill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  bottomCardActionPillText: {
    color: "#0B2A5B",
    fontSize: 13,
    fontWeight: "800",
  },

  modalOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingTop: 40,
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.35)",
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 6,
  },

  modalSubtitle: {
    fontSize: 14,
    color: "#5F6368",
    lineHeight: 20,
    marginBottom: 14,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FF7A00",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: "#1F1F1F",
  },

  cancelButton: {
    backgroundColor: "#EEF2F7",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  cancelButtonText: {
    color: "#0B2A5B",
    fontWeight: "700",
    fontSize: 15,
  },
});