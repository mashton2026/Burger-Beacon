import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import { supabase } from "../../lib/supabase";
import {
  getCurrentUser,
  signOutCurrentUser,
} from "../../services/authService";
import {
  getVendorMenuPdfSignedUrl,
  uploadVendorMenuPdf,
  uploadVendorPhotos,
} from "../../services/storageService";
import {
  getMyVendorClaims,
  type VendorClaim,
} from "../../services/vendorClaimService";
import { getVendorById, getVendorByOwnerId } from "../../services/vendorService";
import { type Van } from "../../types/van";

type AssetAwareVan = Van & {
  photos?: string[];
  menuPdfUrl?: string | null;
  menuPdfName?: string | null;
};

const FOOD_CATEGORY_OPTIONS = [
  "Burgers",
  "Smash Burgers",
  "BBQ",
  "Vegan",
  "Vegetarian",
  "Desserts",
  "Coffee",
];

function isLocalFileUri(uri: string) {
  return /^(file|content|ph|asset|assets-library):/i.test(uri);
}

export default function VendorDashboardScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const scrollRef = useRef<ScrollView | null>(null);

  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [van, setVan] = useState<Van | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [claims, setClaims] = useState<VendorClaim[]>([]);

  const [name, setName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [menu, setMenu] = useState("");
  const [schedule, setSchedule] = useState("");
  const [vendorMessage, setVendorMessage] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [foodCategories, setFoodCategories] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [menuPdfName, setMenuPdfName] = useState<string | null>(null);
  const [menuPdfUri, setMenuPdfUri] = useState<string | null>(null);
  const [menuPdfStoragePath, setMenuPdfStoragePath] = useState<string | null>(
    null
  );
  const [lat, setLat] = useState<number>(0);
  const [lng, setLng] = useState<number>(0);
  const [editSectionY, setEditSectionY] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [id])
  );

  useEffect(() => {
    if (typeof params.name === "string") setName(params.name);
    if (typeof params.vendorName === "string") setVendorName(params.vendorName);
    if (typeof params.cuisine === "string") setCuisine(params.cuisine);
    if (typeof params.menu === "string") setMenu(params.menu);
    if (typeof params.schedule === "string") setSchedule(params.schedule);
    if (typeof params.vendorMessage === "string") {
      setVendorMessage(params.vendorMessage);
    }
    if (typeof params.isLive === "string") setIsLive(params.isLive === "true");

    if (params.lat && params.lng) {
      const nextLat = Number(params.lat);
      const nextLng = Number(params.lng);

      if (!Number.isNaN(nextLat) && !Number.isNaN(nextLng)) {
        setLat(nextLat);
        setLng(nextLng);
      }
    }

    const rawFoodCategories = params.foodCategories as string | undefined;

    if (rawFoodCategories) {
      try {
        const parsed = JSON.parse(rawFoodCategories);
        if (Array.isArray(parsed)) {
          setFoodCategories(parsed);
        }
      } catch {
        // keep existing categories
      }
    }
  }, [
    params.name,
    params.vendorName,
    params.cuisine,
    params.menu,
    params.schedule,
    params.vendorMessage,
    params.isLive,
    params.foodCategories,
    params.lat,
    params.lng,
  ]);

  async function loadDashboard() {
    setLoading(true);
    setAccessChecked(false);

    const user = await getCurrentUser();

    if (!user) {
      setCurrentUserId(null);
      setVan(null);
      setAccessChecked(true);
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);
    const myClaims = await getMyVendorClaims(user.id);
    setClaims(myClaims);

    try {
      const vendor =
        (await getVendorById(id)) ??
        (user ? await getVendorByOwnerId(user.id) : null);

      if (!vendor) {
        setVan(null);
        setAccessChecked(true);
        setLoading(false);
        return;
      }

      if (vendor.owner_id !== user.id) {
        setVan(null);
        setAccessChecked(true);
        setLoading(false);
        return;
      }

      const assetVendor = vendor as AssetAwareVan;
      const nextPhotos =
        Array.isArray(assetVendor.photos) && assetVendor.photos.length > 0
          ? assetVendor.photos.filter(Boolean)
          : vendor.photo
            ? [vendor.photo]
            : [];

      let nextMenuPdfUri: string | null = null;

      if (assetVendor.menuPdfUrl) {
        nextMenuPdfUri = await getVendorMenuPdfSignedUrl(assetVendor.menuPdfUrl);
      }

      setVan(vendor);
      setName(vendor.name);
      setVendorName(vendor.vendorName ?? "");
      setCuisine(vendor.cuisine);
      setMenu(vendor.menu ?? "");
      setSchedule(vendor.schedule ?? "");
      setVendorMessage(vendor.vendorMessage ?? "");
      setIsLive(vendor.isLive);
      setFoodCategories(vendor.foodCategories ?? []);
      setPhotos(nextPhotos);
      setMenuPdfName(assetVendor.menuPdfName ?? null);
      setMenuPdfUri(nextMenuPdfUri);
      setMenuPdfStoragePath(assetVendor.menuPdfUrl ?? null);
      setLat(vendor.lat);
      setLng(vendor.lng);
      setAccessChecked(true);
      setLoading(false);
    } catch {
      setVan(null);
      setAccessChecked(true);
      setLoading(false);
    }
  }

  function toggleFoodCategory(category: string) {
    setFoodCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }

  async function pickPhotos() {
    if (!van) return;

    const features = getSubscriptionFeatures(van.subscriptionTier);

    if (!features.images) {
      Alert.alert(
        "Growth plan required",
        "Upgrade to Growth or above to upload listing photos."
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to upload vendor photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 8,
    });

    if (result.canceled) {
      return;
    }

    const selectedUris = result.assets.map((asset) => asset.uri).filter(Boolean);

    setPhotos((current) => {
      const merged = [...current, ...selectedUris];
      return Array.from(new Set(merged)).slice(0, 8);
    });
  }

  function removePhoto(indexToRemove: number) {
    setPhotos((current) =>
      current.filter((_, index) => index !== indexToRemove)
    );
  }

  async function pickMenuPdf() {
    if (!van) return;

    const features = getSubscriptionFeatures(van.subscriptionTier);

    if (!features.images) {
      Alert.alert(
        "Growth plan required",
        "Upgrade to Growth or above to upload a menu PDF."
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];

      setMenuPdfName(file.name ?? "menu.pdf");
      setMenuPdfUri(file.uri);
      setMenuPdfStoragePath(null);
    } catch {
      Alert.alert("Upload failed", "We could not open the PDF picker.");
    }
  }

  function removeMenuPdf() {
    setMenuPdfName(null);
    setMenuPdfUri(null);
    setMenuPdfStoragePath(null);
  }

  function jumpToEditSection() {
    scrollRef.current?.scrollTo({
      y: Math.max(editSectionY - 20, 0),
      animated: true,
    });
  }

  function updateLocation() {
    if (!van) return;

    const features = getSubscriptionFeatures(van.subscriptionTier);

    if (!features.liveStatus) {
      router.push("/vendor/upgrade");
      return;
    }

    router.push({
      pathname: "/vendor/pick-location",
      params: {
        returnTo: "dashboard",
        id: van.id,
        name,
        vendorName,
        cuisine,
        menu,
        schedule,
        vendorMessage,
        isLive: String(isLive),
        foodCategories: JSON.stringify(foodCategories),
        lat: String(lat),
        lng: String(lng),
      },
    });
  }

  async function saveChanges() {
    if (!van) {
      Alert.alert("Vendor not found");
      return;
    }

    if (isSaving) {
      return;
    }

    const features = getSubscriptionFeatures(van.subscriptionTier);

    if (!name.trim() || !vendorName.trim() || !cuisine.trim()) {
      Alert.alert(
        "Missing details",
        "Please make sure van name, vendor name, and cuisine are filled in."
      );
      return;
    }

    const user = await getCurrentUser();

    if (!user || user.id !== van.owner_id) {
      Alert.alert("Access denied", "You can only edit your own listing.");
      return;
    }

    setIsSaving(true);

    try {
      let nextPhotos: string[] = [];
      let nextMenuPdfStoragePath: string | null = null;
      let nextMenuPdfName: string | null = null;
      let nextMenuPdfUri: string | null = null;

      if (features.images) {
        const existingRemotePhotos = photos.filter((uri) => !isLocalFileUri(uri));
        const localPhotos = photos.filter((uri) => isLocalFileUri(uri));

        const uploadedPhotoUrls =
          localPhotos.length > 0
            ? await uploadVendorPhotos(user.id, localPhotos)
            : [];

        nextPhotos = [...existingRemotePhotos, ...uploadedPhotoUrls].slice(0, 8);

        if (menuPdfUri && menuPdfName) {
          const isExistingStoredPdf =
            !!menuPdfStoragePath && !isLocalFileUri(menuPdfUri);

          if (isExistingStoredPdf) {
            nextMenuPdfStoragePath = menuPdfStoragePath;
            nextMenuPdfName = menuPdfName;
            nextMenuPdfUri = await getVendorMenuPdfSignedUrl(menuPdfStoragePath);
          } else {
            const uploadedPdf = await uploadVendorMenuPdf(
              user.id,
              menuPdfUri,
              menuPdfName
            );

            nextMenuPdfStoragePath = uploadedPdf.storagePath;
            nextMenuPdfName = uploadedPdf.fileName;
            nextMenuPdfUri = uploadedPdf.signedUrl;
          }
        }
      }

      const { error } = await supabase
        .from("vendors")
        .update({
          name: name.trim(),
          vendor_name: vendorName.trim(),
          cuisine: cuisine.trim(),
          menu: menu.trim() || "Menu coming soon",
          schedule: schedule.trim() || "Schedule coming soon",
          vendor_message: features.reviews ? vendorMessage.trim() : null,
          photo: features.images ? nextPhotos[0] ?? null : null,
          photos: features.images ? nextPhotos : [],
          menu_pdf_url: features.images ? nextMenuPdfStoragePath : null,
          menu_pdf_name: features.images ? nextMenuPdfName : null,
          is_live: features.liveStatus ? isLive : false,
          food_categories: foodCategories,
          lat,
          lng,
        })
        .eq("id", van.id);

      if (error) {
        Alert.alert("Save failed", error.message);
        return;
      }

      setPhotos(nextPhotos);
      setMenuPdfName(nextMenuPdfName);
      setMenuPdfUri(nextMenuPdfUri);
      setMenuPdfStoragePath(nextMenuPdfStoragePath);
      setVan({
        ...van,
        name: name.trim(),
        vendorName: vendorName.trim(),
        cuisine: cuisine.trim(),
        menu: menu.trim() || "Menu coming soon",
        schedule: schedule.trim() || "Schedule coming soon",
        vendorMessage: features.reviews ? vendorMessage.trim() : "",
        isLive: features.liveStatus ? isLive : false,
        foodCategories,
        photo: features.images ? nextPhotos[0] ?? null : null,
        photos: features.images ? nextPhotos : [],
        menuPdfUrl: features.images ? nextMenuPdfStoragePath : null,
        menuPdfName: features.images ? nextMenuPdfName : null,
        lat,
        lng,
      });

      Alert.alert("Saved", "Your dashboard changes were saved.");
    } catch (error) {
      Alert.alert(
        "Save failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteListing() {
    if (!van) return;

    Alert.alert(
      "Delete listing",
      "Are you sure you want to delete this vendor listing?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const user = await getCurrentUser();

            if (!user || user.id !== van.owner_id) {
              Alert.alert(
                "Access denied",
                "You can only delete your own listing."
              );
              return;
            }

            const { error } = await supabase
              .from("vendors")
              .delete()
              .eq("id", van.id);

            if (error) {
              Alert.alert("Delete failed", error.message);
              return;
            }

            Alert.alert("Deleted", "Your vendor listing has been removed.");
            router.replace("/welcome");
          },
        },
      ]
    );
  }

  async function handleLogout() {
    try {
      await signOutCurrentUser();
      router.replace("/welcome");
    } catch (error) {
      Alert.alert(
        "Logout failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const latestClaim = claims[0] ?? null;

  if (!loading && accessChecked && !van && latestClaim) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundTitle}>
          {latestClaim.status === "pending"
            ? "Claim Under Review"
            : latestClaim.status === "rejected"
              ? "Claim Not Approved"
              : "Claim Approved"}
        </Text>

        <Text style={styles.accessText}>
          {latestClaim.status === "pending"
            ? "Your claim is being reviewed. Send your selected proof to support@bitebeacon.uk and wait for approval before you can manage this listing."
            : latestClaim.status === "rejected"
              ? "Your claim was not approved. Review the admin note below before trying again."
              : "Your claim has been approved. Please log in again if your listing access has not updated yet."}
        </Text>

        <View style={styles.cardBox}>
          <Text style={styles.claimStatus}>
            Status: {latestClaim.status.toUpperCase()}
          </Text>

          {latestClaim.admin_note ? (
            <>
              <Text style={styles.claimNoteLabel}>Admin Note</Text>
              <Text style={styles.claimNote}>{latestClaim.admin_note}</Text>
            </>
          ) : latestClaim.status === "pending" ? (
            <Text style={styles.claimPending}>Waiting for admin review...</Text>
          ) : null}
        </View>

        <Pressable
          style={styles.softButtonDark}
          onPress={() => router.replace("/welcome")}
        >
          <Text style={styles.softButtonDarkText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  if (
    !loading &&
    accessChecked &&
    (!van || !currentUserId || van.owner_id !== currentUserId)
  ) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundTitle}>Access denied</Text>
        <Text style={styles.accessText}>
          You can only manage your own vendor listing.
        </Text>

        <Pressable style={styles.softButtonDark} onPress={() => router.back()}>
          <Text style={styles.softButtonDarkText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!van) {
    return null;
  }

  const features = getSubscriptionFeatures(van.subscriptionTier);
  const listingReady = !!menu.trim() && !!schedule.trim();

  const currentPlanLabel =
    van.subscriptionTier === "growth"
      ? "Growth plan"
      : van.subscriptionTier === "pro"
        ? "Pro plan"
        : "Free plan";

  const planBadgeStyle =
    van.subscriptionTier === "pro"
      ? styles.planBadgePro
      : van.subscriptionTier === "growth"
        ? styles.planBadgeGrowth
        : styles.planBadgeFree;

  const planBadgeTextStyle =
    van.subscriptionTier === "pro"
      ? styles.planBadgeTextPro
      : van.subscriptionTier === "growth"
        ? styles.planBadgeTextGrowth
        : styles.planBadgeTextFree;

  const statusLabel = features.liveStatus
    ? isLive
      ? "Live"
      : "Offline"
    : "Listed";

  const upgradeTitle =
    van.subscriptionTier === "growth"
      ? "Move up to Pro"
      : "Upgrade your vendor tools";

  const upgradeText =
    van.subscriptionTier === "growth"
      ? "Unlock featured badge, priority placement, promotions, notifications, and trending boost."
      : "Unlock photos, live status, analytics, reviews, and a stronger vendor presence.";

  const upgradeButtonText =
    van.subscriptionTier === "growth" ? "Upgrade to Pro" : "Upgrade to Growth";

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Vendor Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Manage your listing, track your readiness, and keep your presence
              sharp for customers.
            </Text>
          </View>

          <Pressable
            style={styles.accountIconButton}
            onPress={() => router.replace("/(tabs)/account")}
          >
            <Text style={styles.accountIconText}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      {claims.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Claim</Text>
            <Text style={styles.sectionSubtitle}>
              Track the status of your ownership request.
            </Text>
          </View>

          <View style={styles.cardBox}>
            {claims.slice(0, 1).map((claim) => (
              <View key={claim.id}>
                <Text style={styles.claimStatus}>
                  Status: {claim.status.toUpperCase()}
                </Text>

                {claim.admin_note ? (
                  <>
                    <Text style={styles.claimNoteLabel}>Admin Note</Text>
                    <Text style={styles.claimNote}>{claim.admin_note}</Text>
                  </>
                ) : (
                  <Text style={styles.claimPending}>
                    Waiting for admin review...
                  </Text>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryTextBlock}>
            <Text style={styles.summaryTitle}>{van.name}</Text>
            <Text style={styles.summarySubtitle}>
              {vendorName || van.vendorName || "Vendor name not added"}
            </Text>

            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.statusBadge,
                  features.liveStatus
                    ? isLive
                      ? styles.statusBadgeLive
                      : styles.statusBadgeOffline
                    : styles.statusBadgeListed,
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {features.liveStatus ? (isLive ? "LIVE" : "OFFLINE") : "LISTED"}
                </Text>
              </View>

              <View style={[styles.planBadge, planBadgeStyle]}>
                <Text style={[styles.planBadgeText, planBadgeTextStyle]}>
                  {currentPlanLabel}
                </Text>
              </View>
            </View>

            <Text style={styles.summaryMeta}>
              {cuisine || "Cuisine not added yet"}
            </Text>

            <Text style={styles.summarySupport}>
              {listingReady
                ? "Your listing is looking strong and ready for customers."
                : "Complete your menu and schedule to strengthen your listing."}
            </Text>
          </View>

          {features.images && photos[0] ? (
            <Image source={{ uri: photos[0] }} style={styles.summaryImage} />
          ) : null}
        </View>

        <View style={styles.summaryStatsRow}>
          <View style={styles.summaryStatPill}>
            <Text style={styles.summaryStatLabel}>Rating</Text>
            <Text style={styles.summaryStatValue}>{van.rating.toFixed(1)}</Text>
          </View>

          <View style={styles.summaryStatPill}>
            <Text style={styles.summaryStatLabel}>Views</Text>
            <Text style={styles.summaryStatValue}>{van.views ?? 0}</Text>
          </View>

          <View style={styles.summaryStatPill}>
            <Text style={styles.summaryStatLabel}>Photos</Text>
            <Text style={styles.summaryStatValue}>{photos.length}</Text>
          </View>

          <View style={styles.summaryStatPill}>
            <Text style={styles.summaryStatLabel}>Status</Text>
            <Text style={styles.summaryStatValue}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.sectionSubtitle}>
          Jump into the tools you are most likely to use.
        </Text>
      </View>

      <View style={styles.cardBox}>
        <View style={styles.actionsRow}>
          {features.liveStatus ? (
            <Pressable
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => setIsLive((current) => !current)}
            >
              <Text style={styles.actionButtonPrimaryText}>
                {isLive ? "Go Offline" : "Go Live"}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.actionButton, styles.actionButtonLocked]}
              onPress={() => router.push("/vendor/upgrade")}
            >
              <Text style={styles.actionButtonPrimaryText}>Go Live 🔒</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() =>
              router.push({
                pathname: "/vendor/[id]",
                params: { id: van.id },
              })
            }
          >
            <Text style={styles.actionButtonSecondaryText}>View Listing</Text>
          </Pressable>
        </View>

        <View style={styles.actionsRowLast}>
          {features.reviews ? (
            <Pressable
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={jumpToEditSection}
            >
              <Text style={styles.actionButtonSecondaryText}>Update Status</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.actionButton, styles.actionButtonLocked]}
              onPress={() => router.push("/vendor/upgrade")}
            >
              <Text style={styles.actionButtonSecondaryText}>
                Update Status 🔒
              </Text>
            </Pressable>
          )}

          {features.liveStatus ? (
            <Pressable
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={updateLocation}
            >
              <Text style={styles.actionButtonSecondaryText}>
                Update Location
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.actionButton, styles.actionButtonLocked]}
              onPress={() => router.push("/vendor/upgrade")}
            >
              <Text style={styles.actionButtonSecondaryText}>
                Update Location 🔒
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {van.subscriptionTier !== "pro" ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tier Growth</Text>
            <Text style={styles.sectionSubtitle}>
              See what your next plan unlocks for your business.
            </Text>
          </View>

          <View style={styles.cardBox}>
            <View style={styles.upgradeBadge}>
              <Text style={styles.upgradeBadgeText}>{currentPlanLabel}</Text>
            </View>

            <Text style={styles.upgradeTitle}>{upgradeTitle}</Text>
            <Text style={styles.upgradeText}>{upgradeText}</Text>

            <View style={styles.upgradeFeatureList}>
              {van.subscriptionTier === "free" ? (
                <>
                  <Text style={styles.upgradeFeature}>• Add listing photos</Text>
                  <Text style={styles.upgradeFeature}>• Use live status</Text>
                  <Text style={styles.upgradeFeature}>• Unlock analytics</Text>
                  <Text style={styles.upgradeFeature}>• Share status updates</Text>
                </>
              ) : (
                <>
                  <Text style={styles.upgradeFeature}>
                    • Unlock featured badge
                  </Text>
                  <Text style={styles.upgradeFeature}>
                    • Get priority placement
                  </Text>
                  <Text style={styles.upgradeFeature}>
                    • Use promotions and notifications
                  </Text>
                  <Text style={styles.upgradeFeature}>
                    • Access trending boost
                  </Text>
                </>
              )}
            </View>

            <Pressable
              style={styles.upgradeButton}
              onPress={() => router.push("/vendor/upgrade")}
            >
              <Text style={styles.upgradeButtonText}>{upgradeButtonText}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tier Growth</Text>
            <Text style={styles.sectionSubtitle}>
              You are already on the highest BiteBeacon plan.
            </Text>
          </View>

          <View style={styles.cardBox}>
            <Text style={styles.proNoteTitle}>Pro Active</Text>
            <Text style={styles.proNoteText}>
              You have access to premium visibility tools including featured
              status, promotions, notifications, and trending boost.
            </Text>
          </View>
        </>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Listing Health</Text>
        <Text style={styles.sectionSubtitle}>
          Make sure your listing looks complete and trustworthy.
        </Text>
      </View>

      <View style={styles.cardBox}>
        <View style={styles.healthHeader}>
          <Text style={styles.healthTitle}>
            {listingReady ? "Ready to publish" : "Needs attention"}
          </Text>
          <Text style={styles.healthSubtitle}>
            Keep the essentials updated so customers trust your listing.
          </Text>
        </View>

        <View style={styles.healthRow}>
          <Text style={styles.healthLabel}>Photos</Text>
          <Text style={styles.healthValue}>
            {features.images
              ? photos.length > 0
                ? `${photos.length} added`
                : "Missing"
              : "Growth required"}
          </Text>
        </View>

        <View style={styles.healthRow}>
          <Text style={styles.healthLabel}>Menu</Text>
          <Text style={styles.healthValue}>{menu.trim() ? "Added" : "Missing"}</Text>
        </View>

        <View style={styles.healthRow}>
          <Text style={styles.healthLabel}>Schedule</Text>
          <Text style={styles.healthValue}>
            {schedule.trim() ? "Added" : "Missing"}
          </Text>
        </View>

        <View style={styles.healthRow}>
          <Text style={styles.healthLabel}>Menu PDF</Text>
          <Text style={styles.healthValue}>
            {menuPdfName ? "Added" : "Optional"}
          </Text>
        </View>

        <View style={styles.healthRowLast}>
          <Text style={styles.healthLabel}>Live Status</Text>
          <Text style={styles.healthValue}>
            {features.liveStatus ? (isLive ? "Enabled" : "Off") : "Growth required"}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Listing Assets</Text>
        <Text style={styles.sectionSubtitle}>
          Manage your photo gallery and optional menu PDF.
        </Text>
      </View>

      <View style={styles.cardBox}>
        <Text style={styles.assetSectionTitle}>Photo Gallery</Text>
        <Text style={styles.assetSectionText}>
          Add multiple photos to improve your listing. The first photo becomes
          the main image for now.
        </Text>

        {features.images ? (
          <>
            <Pressable style={styles.softButton} onPress={pickPhotos}>
              <Text style={styles.softButtonText}>Add Photos</Text>
            </Pressable>

            {photos.length > 0 ? (
              <View style={styles.galleryGrid}>
                {photos.map((photoUri, index) => (
                  <View key={`${photoUri}-${index}`} style={styles.galleryItem}>
                    <Image source={{ uri: photoUri }} style={styles.galleryImage} />
                    <Pressable
                      style={styles.galleryDeleteButton}
                      onPress={() => removePhoto(index)}
                    >
                      <Text style={styles.galleryDeleteButtonText}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyAssetBox}>
                <Text style={styles.emptyAssetTitle}>No photos uploaded yet</Text>
                <Text style={styles.emptyAssetText}>
                  Add photos to make your listing look more complete.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.inlineLockedCard}>
            <Text style={styles.inlineLockedTitle}>Growth plan required</Text>
            <Text style={styles.inlineLockedText}>
              Upgrade to add a photo gallery to your listing.
            </Text>
          </View>
        )}

        <View style={styles.assetDivider} />

        <Text style={styles.assetSectionTitle}>Menu PDF</Text>
        <Text style={styles.assetSectionText}>
          Upload a PDF menu for customers.
        </Text>

        {features.images ? (
          <>
            <Pressable style={styles.softButton} onPress={pickMenuPdf}>
              <Text style={styles.softButtonText}>
                {menuPdfName ? "Replace Menu PDF" : "Upload Menu PDF"}
              </Text>
            </Pressable>

            {menuPdfName ? (
              <View style={styles.pdfCard}>
                <Text style={styles.pdfName}>{menuPdfName}</Text>

                <View style={styles.pdfActionsRow}>
                  <Pressable
                    style={styles.pdfActionButton}
                    onPress={() => {
                      if (menuPdfUri) {
                        Linking.openURL(menuPdfUri);
                      }
                    }}
                  >
                    <Text style={styles.pdfActionButtonText}>View</Text>
                  </Pressable>

                  <Pressable
                    style={styles.pdfDeleteButton}
                    onPress={removeMenuPdf}
                  >
                    <Text style={styles.pdfDeleteButtonText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.emptyAssetBox}>
                <Text style={styles.emptyAssetTitle}>
                  No menu PDF uploaded yet
                </Text>
                <Text style={styles.emptyAssetText}>
                  This is optional, but useful if you want a menu file ready.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.inlineLockedCard}>
            <Text style={styles.inlineLockedTitle}>Growth plan required</Text>
            <Text style={styles.inlineLockedText}>
              Upgrade to upload a PDF version of your menu.
            </Text>
          </View>
        )}
      </View>

      <View
        style={styles.sectionHeader}
        onLayout={(event) => setEditSectionY(event.nativeEvent.layout.y)}
      >
        <Text style={styles.sectionTitle}>Edit Listing</Text>
        <Text style={styles.sectionSubtitle}>
          Update the details customers see on your public profile.
        </Text>
      </View>

      <View style={styles.cardBox}>
        <Text style={styles.label}>Van name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Van name"
          placeholderTextColor="#7A7A7A"
        />

        <Text style={styles.label}>Vendor name</Text>
        <TextInput
          style={styles.input}
          value={vendorName}
          onChangeText={setVendorName}
          placeholder="Vendor name"
          placeholderTextColor="#7A7A7A"
        />

        <Text style={styles.label}>Cuisine</Text>
        <TextInput
          style={styles.input}
          value={cuisine}
          onChangeText={setCuisine}
          placeholder="Cuisine"
          placeholderTextColor="#7A7A7A"
        />

        <Text style={styles.label}>Menu</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={menu}
          onChangeText={setMenu}
          placeholder="Menu"
          placeholderTextColor="#7A7A7A"
          multiline
        />

        <Text style={styles.label}>Schedule</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={schedule}
          onChangeText={setSchedule}
          placeholder="Weekly schedule"
          placeholderTextColor="#7A7A7A"
          multiline
        />

        <Text style={styles.label}>Food categories</Text>
        <View style={styles.checkboxGroup}>
          {FOOD_CATEGORY_OPTIONS.map((category) => {
            const isSelected = foodCategories.includes(category);

            return (
              <Pressable
                key={category}
                style={[
                  styles.checkboxChip,
                  isSelected && styles.checkboxChipSelected,
                ]}
                onPress={() => toggleFoodCategory(category)}
              >
                <Text
                  style={[
                    styles.checkboxChipText,
                    isSelected && styles.checkboxChipTextSelected,
                  ]}
                >
                  {isSelected ? "✓ " : ""}
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {features.reviews ? (
          <>
            <Text style={styles.label}>Status Update</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={vendorMessage}
              onChangeText={setVendorMessage}
              placeholder="Share a quick update for today"
              placeholderTextColor="#7A7A7A"
              multiline
              maxLength={140}
            />
          </>
        ) : (
          <View style={styles.inlineLockedCard}>
            <Text style={styles.inlineLockedTitle}>Growth plan required</Text>
            <Text style={styles.inlineLockedText}>
              Upgrade to post daily status updates and offers.
            </Text>
          </View>
        )}

        {features.liveStatus ? (
          <View style={styles.liveRow}>
            <Text style={styles.liveLabel}>Live now</Text>
            <Switch value={isLive} onValueChange={setIsLive} />
          </View>
        ) : (
          <View style={styles.liveRow}>
            <Text style={styles.liveLabel}>Live now</Text>
            <Text style={styles.liveLockedText}>Growth required</Text>
          </View>
        )}

        <Pressable
          style={[styles.primaryButton, isSaving && { opacity: 0.7 }]}
          onPress={saveChanges}
          disabled={isSaving}
        >
          <Text style={styles.primaryButtonText}>
            {isSaving ? "Saving Changes..." : "Save Changes"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.softButton}
          onPress={() =>
            router.replace({
              pathname: "/vendor/[id]",
              params: { id: van.id },
            })
          }
        >
          <Text style={styles.softButtonText}>Back to Vendor Page</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        <Text style={styles.sectionSubtitle}>
          Sign out or permanently remove your listing.
        </Text>
      </View>

      <View style={styles.cardBox}>
        <Pressable style={styles.softButton} onPress={handleLogout}>
          <Text style={styles.softButtonText}>Log Out</Text>
        </Pressable>

        <Pressable style={styles.deleteButton} onPress={deleteListing}>
          <Text style={styles.deleteButtonText}>Delete Listing</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.manageButton}
        onPress={() => router.replace("/(tabs)/account")}
      >
        <Text style={styles.manageButtonText}>Account & Settings</Text>
      </Pressable>
    </ScrollView>
  );
}

const thinOrange = "rgba(255,122,0,0.35)";
const thinBlack = "rgba(0,0,0,0.14)";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B2A5B",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    backgroundColor: "#0B2A5B",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  notFoundTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
  },

  accessText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 18,
  },

  headerBlock: {
    marginBottom: 22,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  headerTextWrap: {
    flex: 1,
  },

  accountIconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FF7A00",
  },

  accountIconText: {
    fontSize: 20,
  },

  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 24,
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: thinOrange,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  cardBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: thinOrange,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 16,
  },

  summaryTextBlock: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 6,
  },

  summarySubtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5F6368",
    marginBottom: 10,
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },

  summaryImage: {
    width: 82,
    height: 82,
    borderRadius: 18,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  statusBadgeLive: {
    backgroundColor: "#1DB954",
  },

  statusBadgeOffline: {
    backgroundColor: "#888888",
  },

  statusBadgeListed: {
    backgroundColor: "#4F6B94",
  },

  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  planBadgeFree: {
    backgroundColor: "#EEF2F7",
  },

  planBadgeGrowth: {
    backgroundColor: "#DCE7F7",
  },

  planBadgePro: {
    backgroundColor: "#FFF0E3",
  },

  planBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  planBadgeTextFree: {
    color: "#355070",
  },

  planBadgeTextGrowth: {
    color: "#0B2A5B",
  },

  planBadgeTextPro: {
    color: "#FF7A00",
  },

  summaryMeta: {
    fontSize: 15,
    color: "#444444",
    marginBottom: 8,
    fontWeight: "600",
  },

  summarySupport: {
    fontSize: 14,
    color: "#5F6368",
    lineHeight: 21,
  },

  summaryStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },

  summaryStatPill: {
    minWidth: "47%",
    flex: 1,
    backgroundColor: "#F5F7FA",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: thinBlack,
  },

  summaryStatLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  summaryStatValue: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0B2A5B",
  },

  sectionHeader: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 20,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  actionsRowLast: {
    flexDirection: "row",
    gap: 12,
  },

  actionButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },

  actionButtonPrimary: {
    backgroundColor: "#FF7A00",
  },

  actionButtonSecondary: {
    backgroundColor: "#0B2A5B",
  },

  actionButtonLocked: {
    backgroundColor: "#F4F4F4",
    borderWidth: 1,
    borderColor: "#E2E2E2",
  },

  actionButtonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  actionButtonSecondaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  upgradeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF2F7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },

  upgradeBadgeText: {
    color: "#0B2A5B",
    fontSize: 12,
    fontWeight: "800",
  },

  upgradeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 8,
  },

  upgradeText: {
    fontSize: 15,
    color: "#5F6368",
    lineHeight: 22,
    marginBottom: 14,
  },

  upgradeFeatureList: {
    marginBottom: 14,
  },

  upgradeFeature: {
    fontSize: 14,
    color: "#1F2937",
    marginBottom: 8,
    lineHeight: 20,
  },

  upgradeButton: {
    backgroundColor: "#FF7A00",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },

  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  proNoteTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 8,
  },

  proNoteText: {
    fontSize: 15,
    color: "#5F6368",
    lineHeight: 22,
  },

  healthHeader: {
    marginBottom: 12,
  },

  healthTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },

  healthSubtitle: {
    fontSize: 14,
    color: "#5F6368",
    lineHeight: 20,
  },

  healthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },

  healthRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
  },

  healthLabel: {
    fontSize: 14,
    color: "#5F6368",
    fontWeight: "700",
  },

  healthValue: {
    fontSize: 14,
    color: "#0B2A5B",
    fontWeight: "800",
  },

  assetSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 6,
  },

  assetSectionText: {
    fontSize: 14,
    color: "#5F6368",
    lineHeight: 21,
    marginBottom: 14,
  },

  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  galleryItem: {
    width: "48%",
    backgroundColor: "#F5F7FA",
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: thinBlack,
  },

  galleryImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },

  galleryDeleteButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  galleryDeleteButtonText: {
    color: "#C62828",
    fontSize: 13,
    fontWeight: "800",
  },

  assetDivider: {
    height: 1,
    backgroundColor: "#ECECEC",
    marginVertical: 18,
  },

  pdfCard: {
    backgroundColor: "#F5F7FA",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: thinBlack,
  },

  pdfName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B2A5B",
    marginBottom: 12,
  },

  pdfActionsRow: {
    flexDirection: "row",
    gap: 10,
  },

  pdfActionButton: {
    flex: 1,
    backgroundColor: "#0B2A5B",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  pdfActionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  pdfDeleteButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  pdfDeleteButtonText: {
    color: "#C62828",
    fontSize: 14,
    fontWeight: "700",
  },

  emptyAssetBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  emptyAssetTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },

  emptyAssetText: {
    fontSize: 14,
    color: "#5F6368",
    lineHeight: 20,
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0B2A5B",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FF7A00",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    color: "#1F1F1F",
  },

  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },

  checkboxGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  checkboxChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  checkboxChipSelected: {
    backgroundColor: "#0B2A5B",
    borderColor: "#0B2A5B",
  },

  checkboxChipText: {
    color: "#0B2A5B",
    fontSize: 14,
    fontWeight: "700",
  },

  checkboxChipTextSelected: {
    color: "#FFFFFF",
  },

  inlineLockedCard: {
    backgroundColor: "#FFF3E0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: thinOrange,
  },

  inlineLockedTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#8A4B00",
    marginBottom: 4,
  },

  inlineLockedText: {
    fontSize: 14,
    color: "#8A4B00",
    lineHeight: 20,
  },

  liveRow: {
    backgroundColor: "#F5F7FA",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: thinBlack,
  },

  liveLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B2A5B",
  },

  liveLockedText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8A4B00",
  },

  primaryButton: {
    backgroundColor: "#FF7A00",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  softButton: {
    backgroundColor: "#EEF2F7",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },

  softButtonText: {
    color: "#0B2A5B",
    fontSize: 16,
    fontWeight: "700",
  },

  softButtonDark: {
    backgroundColor: "#EEF2F7",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: "center",
  },

  softButtonDarkText: {
    color: "#0B2A5B",
    fontSize: 15,
    fontWeight: "700",
  },

  deleteButton: {
    backgroundColor: "#C62828",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },

  deleteButtonText: {
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
    fontWeight: "700",
  },

  claimStatus: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 10,
  },

  claimNoteLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FF7A00",
    marginBottom: 6,
  },

  claimNote: {
    fontSize: 14,
    color: "#222222",
    lineHeight: 20,
  },

  claimPending: {
    fontSize: 14,
    color: "#888888",
    fontStyle: "italic",
  },
});