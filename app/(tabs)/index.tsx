import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import BurgerVanCard from "../../components/BurgerVanCard";
import { theme } from "../../constants/theme";
import { mapVendorRowsToVans } from "../../lib/mapVendor";
import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import { supabase } from "../../lib/supabase";
import { type Van } from "../../types/van";

const CUSTOM_VANS_KEY = "bitebeacon_custom_vans";

type BrowseFilter = "ALL" | "LIVE NOW" | "TOP RATED" | "FEATURED";

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

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function matchesFoodCategory(van: Van, category: string) {
  const target = normalizeText(category);

  if (!target) return true;

  return (van.foodCategories ?? []).some(
    (item) => normalizeText(item) === target
  );
}

function matchesSearchQuery(van: Van, query: string) {
  const search = normalizeText(query);

  if (!search) return true;

  const inName = normalizeText(van.name).includes(search);
  const inVendorName = normalizeText(van.vendorName).includes(search);
  const inCuisine = normalizeText(van.cuisine).includes(search);
  const inCategories = (van.foodCategories ?? []).some((category) =>
    normalizeText(category).includes(search)
  );

  return inName || inVendorName || inCuisine || inCategories;
}

export default function HomeScreen() {
  const [supabaseVans, setSupabaseVans] = useState<Van[]>([]);
  const [customVans, setCustomVans] = useState<Van[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<BrowseFilter>("ALL");
  const [selectedFoodCategory, setSelectedFoodCategory] =
    useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const aboutFade = useRef(new Animated.Value(0)).current;
  const aboutSlide = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    requestUserLocation();
    loadSupabaseVans();

    Animated.parallel([
      Animated.timing(aboutFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(aboutSlide, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustomVans();
      loadSupabaseVans();
    }, [])
  );

  async function loadSupabaseVans() {
    const { data, error } = await supabase.from("vendors").select("*");

    if (error) {
      console.log("Error loading vendors:", error.message);
      return;
    }

    const mappedVans = mapVendorRowsToVans(data ?? []);
    setSupabaseVans(mappedVans);
  }

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

      if (permission.status !== "granted") return;

      const current = await Location.getCurrentPositionAsync({});

      setUserLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch { }
  }

  const allVans: Van[] = [...supabaseVans, ...customVans];

  const visibleVans = useMemo(() => {
    return allVans.filter((van) => {
      if (van.isSuspended) return false;

      if (
        van.listingSource === "user_spotted" &&
        van.expiresAt &&
        new Date(van.expiresAt) < new Date()
      ) {
        return false;
      }

      return true;
    });
  }, [allVans]);

  const foodCategories = useMemo(() => {
    const discoveredCategories = new Set<string>();

    visibleVans.forEach((van) => {
      (van.foodCategories ?? []).forEach((category) => {
        const cleaned = category.trim();
        if (cleaned) {
          discoveredCategories.add(cleaned);
        }
      });
    });

    return [
      "ALL",
      ...Array.from(discoveredCategories).sort((a, b) =>
        a.localeCompare(b)
      ),
    ];
  }, [visibleVans]);

  const filteredVans = useMemo(() => {
    let workingVans = [...visibleVans];

    if (selectedFilter === "LIVE NOW") {
      workingVans = workingVans.filter(
        (van) =>
          getSubscriptionFeatures(van.subscriptionTier).liveStatus && van.isLive
      );
    }

    if (selectedFilter === "FEATURED") {
      workingVans = workingVans.filter((van) => van.subscriptionTier === "pro");
    }

    if (selectedFoodCategory !== "ALL") {
      workingVans = workingVans.filter((van) =>
        matchesFoodCategory(van, selectedFoodCategory)
      );
    }

    if (searchQuery.trim()) {
      workingVans = workingVans.filter((van) =>
        matchesSearchQuery(van, searchQuery)
      );
    }

    const sortedVans = [...workingVans].sort((a, b) => {
      const tierRank = { pro: 3, growth: 2, free: 1 };

      const aRank = tierRank[a.subscriptionTier ?? "free"];
      const bRank = tierRank[b.subscriptionTier ?? "free"];

      if (selectedFilter === "TOP RATED" && b.rating !== a.rating) {
        return b.rating - a.rating;
      }

      if (selectedFilter === "LIVE NOW" && a.isLive !== b.isLive) {
        return a.isLive ? -1 : 1;
      }

      if (userLocation) {
        const distanceA = getDistanceMiles(
          userLocation.latitude,
          userLocation.longitude,
          a.lat,
          a.lng
        );

        const distanceB = getDistanceMiles(
          userLocation.latitude,
          userLocation.longitude,
          b.lat,
          b.lng
        );

        if (Math.abs(distanceA - distanceB) > 0.05) {
          return distanceA - distanceB;
        }
      }

      if (aRank !== bRank) {
        return bRank - aRank;
      }

      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }

      return a.name.localeCompare(b.name);
    });

    return sortedVans;
  }, [
    visibleVans,
    selectedFilter,
    selectedFoodCategory,
    searchQuery,
    userLocation,
  ]);

  const liveNowVans = useMemo(() => {
    return [...visibleVans]
      .filter(
        (van) =>
          getSubscriptionFeatures(van.subscriptionTier).liveStatus && van.isLive
      )
      .sort((a, b) => {
        const tierRank = { pro: 3, growth: 2, free: 1 };
        const aRank = tierRank[a.subscriptionTier ?? "free"];
        const bRank = tierRank[b.subscriptionTier ?? "free"];

        if (userLocation) {
          const distanceA = getDistanceMiles(
            userLocation.latitude,
            userLocation.longitude,
            a.lat,
            a.lng
          );

          const distanceB = getDistanceMiles(
            userLocation.latitude,
            userLocation.longitude,
            b.lat,
            b.lng
          );

          if (Math.abs(distanceA - distanceB) > 0.05) {
            return distanceA - distanceB;
          }
        }

        if (aRank !== bRank) {
          return bRank - aRank;
        }

        return b.rating - a.rating;
      })
      .slice(0, 6);
  }, [visibleVans, userLocation]);

  const featuredProVans = useMemo(() => {
    return [...visibleVans]
      .filter((van) => van.subscriptionTier === "pro")
      .sort((a, b) => {
        if (userLocation) {
          const distanceA = getDistanceMiles(
            userLocation.latitude,
            userLocation.longitude,
            a.lat,
            a.lng
          );

          const distanceB = getDistanceMiles(
            userLocation.latitude,
            userLocation.longitude,
            b.lat,
            b.lng
          );

          if (Math.abs(distanceA - distanceB) > 0.05) {
            return distanceA - distanceB;
          }
        }

        return b.rating - a.rating;
      })
      .slice(0, 4);
  }, [visibleVans, userLocation]);

  function getVendorDistance(van: Van) {
    if (!userLocation) return null;

    return getDistanceMiles(
      userLocation.latitude,
      userLocation.longitude,
      van.lat,
      van.lng
    );
  }

  function renderCompactLiveCard(van: Van) {
    return (
      <Pressable
        key={`live-${van.id}`}
        style={styles.liveCard}
        onPress={() => router.push(`/vendor/${van.id}`)}
      >
        <View style={styles.liveCardTop}>
          <Text style={styles.liveCardBadge}>LIVE</Text>
          {van.subscriptionTier === "pro" ? (
            <Text style={styles.liveCardFeatured}>FEATURED</Text>
          ) : null}
        </View>

        <Text style={styles.liveCardTitle} numberOfLines={1}>
          {van.name}
        </Text>

        <Text style={styles.liveCardCuisine} numberOfLines={1}>
          {van.cuisine}
        </Text>

        <View style={styles.liveCardFooter}>
          <Text style={styles.liveCardRating}>★ {van.rating.toFixed(1)}</Text>
          {getVendorDistance(van) !== null ? (
            <Text style={styles.liveCardDistance}>
              {getVendorDistance(van)?.toFixed(1)} mi
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  function renderFoodCategoryChip(category: string) {
    const isActive = selectedFoodCategory === category;

    return (
      <Pressable
        key={category}
        style={[
          styles.foodCategoryChip,
          isActive && styles.foodCategoryChipActive,
        ]}
        onPress={() => setSelectedFoodCategory(category)}
      >
        <Text
          style={[
            styles.foodCategoryChipText,
            isActive && styles.foodCategoryChipTextActive,
          ]}
        >
          {category}
        </Text>
      </Pressable>
    );
  }

  function renderFeaturedVendorCard(van: Van) {
    return (
      <Pressable
        key={`featured-${van.id}`}
        style={styles.featuredCard}
        onPress={() => router.push(`/vendor/${van.id}`)}
      >
        <View style={styles.featuredCardGlow} />
        <View style={styles.featuredCardHeader}>
          <Text style={styles.featuredCardBadge}>FEATURED</Text>
          {getVendorDistance(van) !== null ? (
            <Text style={styles.featuredCardDistance}>
              {getVendorDistance(van)?.toFixed(1)} mi
            </Text>
          ) : null}
        </View>

        <Text style={styles.featuredCardTitle} numberOfLines={1}>
          {van.name}
        </Text>

        <Text style={styles.featuredCardMeta} numberOfLines={1}>
          {van.cuisine}
        </Text>

        <View style={styles.featuredCardFooter}>
          <Text style={styles.featuredCardRating}>★ {van.rating.toFixed(1)}</Text>
          {van.vendorMessage?.trim() ? (
            <Text style={styles.featuredCardDeal}>DEAL</Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  const showEmptyState = filteredVans.length === 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredVans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.heroWrap}>
              <View style={styles.hero}>
                <Image
                  source={require("../../assets/images/logo.png")}
                  style={styles.logo}
                  resizeMode="cover"
                />
              </View>
            </View>

            <Animated.View
              style={[
                styles.aboutSection,
                {
                  opacity: aboutFade,
                  transform: [{ translateY: aboutSlide }],
                },
              ]}
            >
              <Text style={styles.aboutGreeting}>To BiteBeacon users,</Text>

              <Text style={styles.aboutText}>
                I built BiteBeacon to make street food easier to find, support
                local vendors, and help more people discover what is worth the
                trip.
              </Text>

              <Text style={styles.aboutSignature}>— Founder</Text>

              <View style={styles.aboutDivider} />
            </Animated.View>

            {liveNowVans.length > 0 ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Live Now</Text>
                  <Text style={styles.sectionSubtitle}>
                    Ready-to-visit vendors near you
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalListContent}
                >
                  {liveNowVans.map(renderCompactLiveCard)}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Browse by Food</Text>
                <Text style={styles.sectionSubtitle}>
                  Find vendors by the food you want most
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.foodCategoryRow}
              >
                {foodCategories.map(renderFoodCategoryChip)}
              </ScrollView>
            </View>

            {featuredProVans.length > 0 ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Featured Vendors</Text>
                  <Text style={styles.sectionSubtitle}>
                    Premium listings with extra visibility
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalListContent}
                >
                  {featuredProVans.map(renderFeaturedVendorCard)}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.controlsCard}>
              <Text style={styles.controlsTitle}>Browse Vendors</Text>

              <TextInput
                style={styles.searchInput}
                placeholder="Search van, vendor, cuisine, or food type"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <View style={styles.filterRow}>
                {(["ALL", "LIVE NOW", "TOP RATED", "FEATURED"] as BrowseFilter[]).map(
                  (option) => (
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
                  )
                )}
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Vendors Nearby</Text>
              <Text style={styles.sectionSubtitle}>
                Ranked by distance, tier, quality, and availability
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          showEmptyState ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No vendors found</Text>
              <Text style={styles.emptyStateText}>
                Try a different search or change your food and browse filters.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <BurgerVanCard
            id={item.id}
            name={item.name}
            cuisine={item.cuisine}
            rating={item.rating}
            isLive={item.isLive}
            temporary={item.temporary}
            distanceMiles={getVendorDistance(item)}
            subscriptionTier={item.subscriptionTier}
            vendorMessage={item.vendorMessage}
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

  heroWrap: {
    marginTop: 20,
    marginBottom: 18,
  },

  hero: {
    width: "100%",
    height: 280,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: theme.colors.border,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  aboutSection: {
    marginBottom: 24,
  },

  aboutGreeting: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.secondary,
    marginBottom: 6,
  },

  aboutText: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.86)",
    marginBottom: 10,
  },

  aboutSignature: {
    fontSize: 13,
    color: "rgba(255,255,255,0.62)",
    fontStyle: "italic",
  },

  aboutDivider: {
    height: 2,
    width: 120,
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    marginTop: 14,
    alignSelf: "center",
  },

  sectionBlock: {
    marginBottom: 24,
  },

  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },

  horizontalListContent: {
    paddingRight: 8,
  },

  liveCard: {
    width: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  liveCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  liveCardBadge: {
    backgroundColor: theme.colors.success,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },

  liveCardFeatured: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "800",
  },

  liveCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },

  liveCardCuisine: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 14,
  },

  liveCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  liveCardRating: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
  },

  liveCardDistance: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.background,
  },

  foodCategoryRow: {
    paddingRight: 8,
  },

  foodCategoryChip: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },

  foodCategoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  foodCategoryChipText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  foodCategoryChipTextActive: {
    color: "#FFFFFF",
  },

  featuredCard: {
    width: 230,
    minHeight: 150,
    backgroundColor: "#14386E",
    borderRadius: 22,
    padding: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    overflow: "hidden",
    justifyContent: "space-between",
  },

  featuredCardGlow: {
    position: "absolute",
    top: -18,
    right: -18,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,122,0,0.16)",
  },

  featuredCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  featuredCardBadge: {
    backgroundColor: theme.colors.primary,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },

  featuredCardDistance: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700",
  },

  featuredCardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 18,
    marginBottom: 6,
  },

  featuredCardMeta: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 16,
  },

  featuredCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  featuredCardRating: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.secondary,
  },

  featuredCardDeal: {
    backgroundColor: theme.colors.success,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },

  controlsCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
    marginTop: 4,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },

  controlsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
  },

  searchInput: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    color: "#FFFFFF",
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
    fontWeight: "700",
    fontSize: 13,
  },

  filterChipTextActive: {
    color: theme.colors.background,
  },

  emptyState: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: 18,
    marginTop: 6,
  },

  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },

  emptyStateText: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.72)",
  },
});