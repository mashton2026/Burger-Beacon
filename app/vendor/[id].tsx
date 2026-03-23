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
import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import {
  getCurrentUser,
  getCurrentUserVendor,
} from "../../services/authService";
import {
  addFavourite,
  getCurrentUserId,
  isVendorFavourite,
  removeFavourite,
} from "../../services/favouritesService";
import { getVendorMenuPdfSignedUrl } from "../../services/storageService";
import {
  getVendorById,
  incrementVendorDirections,
  setVendorLiveStatus,
} from "../../services/vendorService";
import { type Van } from "../../types/van";

type AssetAwareVan = Van & {
  photos?: string[];
  menuPdfUrl?: string | null;
  menuPdfName?: string | null;
};

export default function VendorScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;

  const [van, setVan] = useState<AssetAwareVan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSavingFavourite, setIsSavingFavourite] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [menuPdfSignedUrl, setMenuPdfSignedUrl] = useState<string | null>(null);
  const [isCurrentUserVendorAccount, setIsCurrentUserVendorAccount] =
    useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadScreen() {
        setLoading(true);
        await loadCurrentUser();
        await loadVan();
        await checkIfFavourite();
        await loadCurrentUserVendorState();
        setLoading(false);
      }

      loadScreen();
    }, [id])
  );

  async function loadCurrentUser() {
    const user = await getCurrentUser();

    if (!user) {
      setCurrentUserId(null);
      return;
    }

    setCurrentUserId(user.id);
  }

  async function loadCurrentUserVendorState() {
    try {
      const vendor = await getCurrentUserVendor();
      setIsCurrentUserVendorAccount(!!vendor);
    } catch {
      setIsCurrentUserVendorAccount(false);
    }
  }

  async function loadVan() {
    try {
      const vendor = (await getVendorById(id)) as AssetAwareVan | null;

      if (!vendor) {
        setVan(null);
        setMenuPdfSignedUrl(null);
        return;
      }

      setVan(vendor);

      if (vendor.menuPdfUrl) {
        const signedUrl = await getVendorMenuPdfSignedUrl(vendor.menuPdfUrl);
        setMenuPdfSignedUrl(signedUrl);
      } else {
        setMenuPdfSignedUrl(null);
      }
    } catch (error) {
      console.log(
        "Error loading vendor:",
        error instanceof Error ? error.message : "Unknown error"
      );
      setVan(null);
      setMenuPdfSignedUrl(null);
    }
  }

  async function checkIfFavourite() {
    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        setIsFavourite(false);
        return;
      }

      const favourite = await isVendorFavourite(userId, id);
      setIsFavourite(favourite);
    } catch (error) {
      console.log(
        "Error checking favourite:",
        error instanceof Error ? error.message : "Unknown error"
      );
      setIsFavourite(false);
    }
  }

  async function toggleLive() {
    if (!van) return;

    const newStatus = !van.isLive;

    try {
      await setVendorLiveStatus(van.id, newStatus);
      setVan({ ...van, isLive: newStatus });
      Alert.alert(newStatus ? "Vendor is now LIVE" : "Vendor is now OFFLINE");
    } catch (error) {
      Alert.alert(
        "Error updating vendor status",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async function openDirections() {
    if (!van) return;

    try {
      const nextDirections = await incrementVendorDirections(
        van.id,
        van.directions ?? 0
      );

      setVan({ ...van, directions: nextDirections });

      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${van.lat},${van.lng}`;
      await Linking.openURL(mapsUrl);
    } catch (error) {
      console.log(
        "Error updating directions:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async function openMenuPdf() {
    if (!menuPdfSignedUrl) {
      Alert.alert("Menu unavailable", "This vendor has not uploaded a menu PDF.");
      return;
    }

    try {
      await Linking.openURL(menuPdfSignedUrl);
    } catch {
      Alert.alert("Open failed", "We could not open the menu PDF.");
    }
  }

  async function toggleFavourite() {
    if (!van) return;

    setIsSavingFavourite(true);

    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        Alert.alert(
          "Login required",
          "Please log in or create an account to save favourites."
        );
        return;
      }

      if (isFavourite) {
        await removeFavourite(userId, van.id);
        setIsFavourite(false);
        Alert.alert("Removed", "This vendor has been removed from your favourites.");
        return;
      }

      const alreadyFavourite = await isVendorFavourite(userId, van.id);

      if (alreadyFavourite) {
        setIsFavourite(true);
        Alert.alert("Already saved", "This vendor is already in your favourites.");
        return;
      }

      await addFavourite(userId, van.id);
      setIsFavourite(true);
      Alert.alert("Saved", "This vendor has been added to your favourites.");
    } catch (error) {
      Alert.alert(
        isFavourite ? "Remove failed" : "Save failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsSavingFavourite(false);
    }
  }

  function openClaimScreen() {
    if (!van) return;

    if (!isCurrentUserVendorAccount) {
      Alert.alert(
        "Vendor login required",
        "Please log in with a vendor account to claim this spotted van."
      );
      return;
    }

    router.push({
      pathname: "/vendor/claim",
      params: { id: van.id },
    });
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.notFound}>Loading listing...</Text>
        </View>
      </View>
    );
  }

  if (!van) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.notFound}>Listing not found</Text>

          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isOwner = !!currentUserId && van.owner_id === currentUserId;
  const features = getSubscriptionFeatures(van.subscriptionTier);

  const galleryPhotos =
    Array.isArray(van.photos) && van.photos.length > 0
      ? van.photos.filter(Boolean)
      : van.photo
        ? [van.photo]
        : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{van.name}</Text>

        {van.subscriptionTier === "pro" ? (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>FEATURED</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.meta}>{van.cuisine}</Text>

        <Text
          style={[
            styles.statusBadge,
            van.temporary
              ? styles.statusTemporary
              : features.liveStatus
                ? van.isLive
                  ? styles.statusGreen
                  : styles.statusGray
                : styles.statusGray,
          ]}
        >
          {van.temporary
            ? "SPOTTED"
            : features.liveStatus
              ? van.isLive
                ? "LIVE"
                : "OFFLINE"
              : "LISTED"}
        </Text>
      </View>

      {galleryPhotos.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Gallery</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryRow}
          >
            {galleryPhotos.map((photoUri, index) => (
              <Image
                key={`${photoUri}-${index}`}
                source={{ uri: photoUri }}
                style={styles.galleryImage}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      {isOwner ? (
        <View style={styles.ownerNotice}>
          <Text style={styles.ownerNoticeText}>
            You are viewing your own vendor listing.
          </Text>
        </View>
      ) : null}

      {van.temporary ? (
        <View style={styles.planHighlightCard}>
          <Text style={styles.planHighlightTitle}>Community Spotted</Text>
          <Text style={styles.planHighlightText}>
            This listing has not yet been verified by BiteBeacon. If this is your
            van, you can submit a claim for review.
          </Text>
        </View>
      ) : van.owner_id ? (
        <View style={styles.verifiedCard}>
          <Text style={styles.verifiedCardTitle}>Vendor Managed</Text>
          <Text style={styles.verifiedCardText}>
            This listing is managed by the vendor through BiteBeacon.
          </Text>
        </View>
      ) : van.subscriptionTier === "growth" ? (
        <View style={styles.planHighlightCard}>
          <Text style={styles.planHighlightTitle}>Growth Vendor</Text>
          <Text style={styles.planHighlightText}>
            This vendor has unlocked richer listing tools on BiteBeacon.
          </Text>
        </View>
      ) : van.subscriptionTier === "pro" ? (
        <View style={styles.planHighlightCard}>
          <Text style={styles.planHighlightTitle}>Featured Vendor</Text>
          <Text style={styles.planHighlightText}>
            This vendor is part of BiteBeacon Pro and receives premium visibility.
          </Text>
        </View>
      ) : null}

      {features.reviews && van.vendorMessage ? (
        <View style={styles.announcementCard}>
          <Text style={styles.announcementTitle}>Today’s Update</Text>
          <Text style={styles.announcementText}>{van.vendorMessage}</Text>
        </View>
      ) : null}

      {(van.foodCategories ?? []).length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Food Categories</Text>
          <View style={styles.categoriesWrap}>
            {(van.foodCategories ?? []).map((category) => (
              <View key={category} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{category}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Vendor</Text>
      <View style={styles.infoCard}>
        <Text style={styles.text}>{van.vendorName}</Text>
      </View>

      <Text style={styles.sectionTitle}>Menu</Text>
      <View style={styles.infoCard}>
        <Text style={styles.text}>{van.menu}</Text>
      </View>

      {van.menuPdfName ? (
        <Pressable style={styles.menuPdfButton} onPress={openMenuPdf}>
          <Text style={styles.menuPdfButtonText}>
            View Menu PDF{van.menuPdfName ? ` (${van.menuPdfName})` : ""}
          </Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>Schedule</Text>
      <View style={styles.infoCard}>
        <Text style={styles.text}>{van.schedule}</Text>
      </View>

      {isOwner ? (
        <>
          {features.liveStatus ? (
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
          ) : null}

          <Pressable style={styles.manageButton} onPress={openDirections}>
            <Text style={styles.manageButtonText}>Get Directions</Text>
          </Pressable>

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
        </>
      ) : van.temporary ? (
        <>
          <Pressable style={styles.manageButton} onPress={openDirections}>
            <Text style={styles.manageButtonText}>Get Directions</Text>
          </Pressable>

          <Pressable style={styles.claimButton} onPress={openClaimScreen}>
            <Text style={styles.claimButtonText}>Claim This Van</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable style={styles.manageButton} onPress={openDirections}>
            <Text style={styles.manageButtonText}>Get Directions</Text>
          </Pressable>

          <Pressable
            style={[
              styles.manageButton,
              isSavingFavourite && styles.disabledButton,
            ]}
            onPress={toggleFavourite}
            disabled={isSavingFavourite}
          >
            <Text style={styles.manageButtonText}>
              {isSavingFavourite
                ? "Updating..."
                : isFavourite
                  ? "★ Saved to Favourites"
                  : "☆ Save to Favourites"}
            </Text>
          </Pressable>
        </>
      )}

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
    marginBottom: 20,
    color: "#0B2A5B",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },

  featuredBadge: {
    backgroundColor: "#FF7A00",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  featuredBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 10,
    color: "#0B2A5B",
    flex: 1,
  },

  meta: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },

  galleryRow: {
    paddingRight: 12,
    marginBottom: 18,
  },

  galleryImage: {
    width: 260,
    height: 190,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: "#E9E9E9",
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
    lineHeight: 22,
    color: "#222222",
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
    fontWeight: "700",
  },

  manageButton: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#0B2A5B",
  },

  claimButton: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#FF7A00",
  },

  claimButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  menuPdfButton: {
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0B2A5B",
  },

  menuPdfButtonText: {
    color: "#0B2A5B",
    fontWeight: "700",
    textAlign: "center",
  },

  disabledButton: {
    opacity: 0.7,
  },

  manageButtonText: {
    color: "#FFFFFF",
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
  },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    color: "#fff",
    fontWeight: "700",
  },

  statusGreen: {
    backgroundColor: "#1DB954",
  },

  statusGray: {
    backgroundColor: "#888",
  },

  statusTemporary: {
    backgroundColor: "#FF7A00",
  },

  announcementCard: {
    backgroundColor: "#FFF8E1",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#FF7A00",
  },

  announcementTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#8A4B00",
    marginBottom: 6,
  },

  announcementText: {
    fontSize: 14,
    color: "#6D4C00",
    lineHeight: 20,
  },

  planHighlightCard: {
    backgroundColor: "#FFF3E0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#FF7A00",
  },

  planHighlightTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#8A4B00",
    marginBottom: 4,
  },

  planHighlightText: {
    fontSize: 14,
    color: "#8A4B00",
    lineHeight: 20,
  },

  verifiedCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#1DB954",
  },

  verifiedCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 4,
  },

  verifiedCardText: {
    fontSize: 14,
    color: "#166534",
    lineHeight: 20,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginTop: 4,
    borderWidth: 2,
    borderColor: "#FF7A00",
  },

  ownerNotice: {
    backgroundColor: "#E8F0FE",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#FF7A00",
  },

  ownerNoticeText: {
    color: "#0B2A5B",
    fontWeight: "600",
  },

  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },

  categoryChip: {
    backgroundColor: "#0B2A5B",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  categoryChipText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});