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
import MapView, { Marker } from "react-native-maps";
import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import { supabase } from "../../lib/supabase";
import {
  getCurrentUser,
  getCurrentUserVendor,
  signOutCurrentUser,
} from "../../services/authService";
import {
  getVendorMenuPdfSignedUrl,
  uploadVendorLogo,
  uploadVendorMenuPdf,
  uploadVendorPhotos,
} from "../../services/storageService";
import {
  getMyVendorClaims,
  type VendorClaim,
} from "../../services/vendorClaimService";
import { getVendorByOwnerId } from "../../services/vendorService";
import { type Van } from "../../types/van";

type AssetAwareVan = Van & {
  photos?: string[];
  menuPdfUrl?: string | null;
  menuPdfName?: string | null;
  logoUrl?: string | null;
  logoPath?: string | null;
};

type InsightPoint = {
  day?: string;
  hour?: number;
  total: number;
};

type AdvancedInsights = {
  views: number;
  directions: number;
  conversion_rate: number;
  daily_views: InsightPoint[];
  peak_hours: InsightPoint[];
};

type HeatmapPoint = {
  lat: number;
  lng: number;
  weight: number;
};

const FOOD_CATEGORY_OPTIONS = [
  "Burgers",
  "Smash Burgers",
  "Fries",
  "Loaded Fries",
  "Hot Dogs",
  "BBQ",
  "Fried Chicken",
  "Pizza",
  "Tacos",
  "Mexican",
  "Sandwiches",
  "Wraps",
  "Kebabs",
  "Asian",
  "Indian",
  "Caribbean",
  "Seafood",
  "Vegan",
  "Vegetarian",
  "Desserts",
  "Ice Cream",
  "Donuts",
  "Cakes",
  "Coffee",
  "Drinks",
  "Breakfast",
];

function isLocalFileUri(uri: string) {
  return /^(file|content|ph|asset|assets-library):/i.test(uri);
}

function getPeakHourLabel(hour: number) {
  const safeHour = Number.isFinite(hour) ? hour : 0;
  const suffix = safeHour >= 12 ? "PM" : "AM";
  const normalized = safeHour % 12 || 12;
  return `${normalized}${suffix}`;
}

function formatShortDayLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function buildLast30DaysViews(points: InsightPoint[]) {
  const totalsByDay = new Map<string, number>();

  points.forEach((point) => {
    if (!point.day) return;
    totalsByDay.set(point.day, point.total ?? 0);
  });

  const days: { day: string; shortLabel: string; total: number }[] = [];

  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - index);

    const isoDay = date.toISOString().slice(0, 10);

    days.push({
      day: isoDay,
      shortLabel: formatShortDayLabel(isoDay),
      total: totalsByDay.get(isoDay) ?? 0,
    });
  }

  return days;
}

function build24HourBuckets(points: InsightPoint[]) {
  const totalsByHour = new Map<number, number>();

  points.forEach((point) => {
    const safeHour = Number(point.hour);
    if (!Number.isInteger(safeHour) || safeHour < 0 || safeHour > 23) return;
    totalsByHour.set(safeHour, point.total ?? 0);
  });

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: getPeakHourLabel(hour),
    shortLabel: hour % 6 === 0 ? getPeakHourLabel(hour) : "",
    total: totalsByHour.get(hour) ?? 0,
  }));
}

function TrendsMiniChart({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle: string;
  points: InsightPoint[];
}) {
  const chartData = buildLast30DaysViews(points);
  const maxTotal = Math.max(...chartData.map((item) => item.total), 1);
  const hasData = chartData.some((item) => item.total > 0);

  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightCardTitle}>{title}</Text>
      <Text style={styles.insightCardSubtitle}>{subtitle}</Text>

      {!hasData ? (
        <View style={styles.emptyInlineCard}>
          <Text style={styles.emptyInlineTitle}>No trend data yet</Text>
          <Text style={styles.emptyInlineText}>
            Daily activity will appear here once customers start engaging with your listing.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.trendChart}>
            {chartData.map((item) => {
              const height = Math.max(
                (item.total / maxTotal) * 120,
                item.total > 0 ? 8 : 4
              );

              return (
                <View key={item.day} style={styles.trendBarWrap}>
                  <View style={styles.trendBarTrack}>
                    <View style={[styles.trendBarFill, { height }]} />
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.trendAxisRow}>
            <Text style={styles.trendAxisLabel}>
              {chartData[0]?.shortLabel}
            </Text>
            <Text style={styles.trendAxisLabel}>
              {chartData[14]?.shortLabel}
            </Text>
            <Text style={styles.trendAxisLabel}>
              {chartData[29]?.shortLabel}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function PeakHoursChart({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle: string;
  points: InsightPoint[];
}) {
  const chartData = build24HourBuckets(points);
  const maxTotal = Math.max(...chartData.map((item) => item.total), 1);
  const hasData = chartData.some((item) => item.total > 0);

  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightCardTitle}>{title}</Text>
      <Text style={styles.insightCardSubtitle}>{subtitle}</Text>

      {!hasData ? (
        <View style={styles.emptyInlineCard}>
          <Text style={styles.emptyInlineTitle}>No peak hour data yet</Text>
          <Text style={styles.emptyInlineText}>
            Hourly engagement will appear here once more customer activity is recorded.
          </Text>
        </View>
      ) : (
        <View style={styles.hourChart}>
          {chartData.map((item) => {
            const height = Math.max(
              (item.total / maxTotal) * 120,
              item.total > 0 ? 8 : 4
            );

            return (
              <View key={item.hour} style={styles.hourBarWrap}>
                <View style={styles.hourBarTrack}>
                  <View style={[styles.hourBarFill, { height }]} />
                </View>

                {item.shortLabel ? (
                  <Text style={styles.hourAxisLabel}>
                    {item.shortLabel}
                  </Text>
                ) : (
                  <View style={styles.hourAxisSpacer} />
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function TierExplanationCard({
  title,
  subtitle,
  isExpanded,
  onToggle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  isExpanded: boolean;
  onToggle: () => void;
  accent: "free" | "growth" | "pro";
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.tierExplainCard,
        accent === "growth" && styles.tierExplainCardGrowth,
        accent === "pro" && styles.tierExplainCardPro,
      ]}
    >
      <Pressable style={styles.tierExplainHeader} onPress={onToggle}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tierExplainTitle}>{title}</Text>
          <Text style={styles.tierExplainSubtitle}>{subtitle}</Text>
        </View>

        <Text style={styles.tierExplainToggle}>{isExpanded ? "−" : "+"}</Text>
      </Pressable>

      {isExpanded ? <View style={styles.tierExplainBody}>{children}</View> : null}
    </View>
  );
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
  const [foodCategorySearch, setFoodCategorySearch] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [menuPdfName, setMenuPdfName] = useState<string | null>(null);
  const [menuPdfUri, setMenuPdfUri] = useState<string | null>(null);
  const [menuPdfStoragePath, setMenuPdfStoragePath] = useState<string | null>(
    null
  );
  const [lat, setLat] = useState<number>(0);
  const [lng, setLng] = useState<number>(0);
  const [editSectionY, setEditSectionY] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [insights, setInsights] = useState<AdvancedInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [expandedTier, setExpandedTier] = useState<"free" | "growth" | "pro">(
    "growth"
  );

  useFocusEffect(
    useCallback(() => {
      async function checkAccess() {
        const vendor = await getCurrentUserVendor();

        if (!vendor) {
          router.replace("/vendor/register");
          return;
        }
      }

      checkAccess();
    }, [])
  );

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

    if (typeof params.isLive === "string") {
      setIsLive(params.isLive === "true");
    }

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

  async function loadAdvancedInsights(vendorId: string, tier: string) {
    if (tier !== "pro") {
      setInsights(null);
      return;
    }

    setInsightsLoading(true);

    try {
      const { data, error } = await supabase.rpc("get_vendor_advanced_insights", {
        p_vendor_id: vendorId,
        p_days: 30,
      });

      if (error) {
        setInsights(null);
        return;
      }

      setInsights(
        (data as AdvancedInsights) ?? {
          views: 0,
          directions: 0,
          conversion_rate: 0,
          daily_views: [],
          peak_hours: [],
        }
      );
    } finally {
      setInsightsLoading(false);
    }
  }

  async function loadHeatmapPoints(vendorId: string, tier: string) {
    if (tier !== "pro") {
      setHeatmapPoints([]);
      return;
    }

    setHeatmapLoading(true);

    try {
      const { data, error } = await supabase.rpc("get_vendor_heatmap_points", {
        p_vendor_id: vendorId,
        p_days: 30,
      });

      if (error) {
        setHeatmapPoints([]);
        return;
      }

      setHeatmapPoints((data as HeatmapPoint[]) ?? []);
    } finally {
      setHeatmapLoading(false);
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setAccessChecked(false);

    try {
      const user = await getCurrentUser();

      if (!user) {
        setCurrentUserId(null);
        setVan(null);
        setAccessChecked(true);
        return;
      }

      setCurrentUserId(user.id);

      const myClaims = await getMyVendorClaims(user.id);
      setClaims(myClaims);

      const vendor = await getVendorByOwnerId(user.id);

      if (!vendor) {
        setVan(null);
        setAccessChecked(true);
        return;
      }

      if (vendor.isSuspended) {
        setVan(null);
        setAccessChecked(true);
        return;
      }

      if (vendor.owner_id !== user.id) {
        setVan(null);
        setAccessChecked(true);
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
      setFoodCategorySearch("");
      setPhotos(nextPhotos);
      setLogoUri(assetVendor.logoUrl ?? null);
      setLogoPath(assetVendor.logoPath ?? null);
      setMenuPdfName(assetVendor.menuPdfName ?? null);
      setMenuPdfUri(nextMenuPdfUri);
      setMenuPdfStoragePath(assetVendor.menuPdfUrl ?? null);
      setLat(vendor.lat);
      setLng(vendor.lng);

      await Promise.all([
        loadAdvancedInsights(vendor.id, vendor.subscriptionTier ?? "free"),
        loadHeatmapPoints(vendor.id, vendor.subscriptionTier ?? "free"),
      ]);

      setAccessChecked(true);
    } catch {
      setVan(null);
      setAccessChecked(true);
    } finally {
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

    if (result.canceled) return;

    const selectedUris = result.assets.map((asset) => asset.uri).filter(Boolean);

    setPhotos((current) => {
      const merged = [...current, ...selectedUris];
      return Array.from(new Set(merged)).slice(0, 8);
    });
  }

  async function pickLogo() {
    if (!van) return;

    if (van.subscriptionTier === "free") {
      Alert.alert(
        "Growth plan required",
        "Upgrade to Growth or above to upload your logo."
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to upload your logo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
      allowsMultipleSelection: false,
    });

    if (result.canceled) return;

    const uri = result.assets[0]?.uri;
    if (!uri) return;

    setLogoUri(uri);
    setLogoPath(null);
  }

  function removePhoto(indexToRemove: number) {
    setPhotos((current) =>
      current.filter((_, index) => index !== indexToRemove)
    );
  }

  function removeLogo() {
    setLogoUri(null);
    setLogoPath(null);
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

      if (result.canceled) return;

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

  async function openMenuPdfFromDashboard() {
    if (!menuPdfStoragePath) {
      Alert.alert("Menu unavailable", "No menu PDF has been uploaded yet.");
      return;
    }

    try {
      const freshUrl = await getVendorMenuPdfSignedUrl(menuPdfStoragePath);

      if (!freshUrl) {
        Alert.alert("Open failed", "We could not open the menu PDF.");
        return;
      }

      await Linking.openURL(freshUrl);
    } catch {
      Alert.alert("Open failed", "We could not open the menu PDF.");
    }
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

  async function handleLiveToggle(newStatus: boolean) {
    if (!van) return;

    try {
      await supabase.from("vendors").update({ is_live: newStatus }).eq("id", van.id);

      setIsLive(newStatus);
    } catch (error) {
      Alert.alert(
        "Error updating live status",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async function saveChanges() {
    if (!van) {
      Alert.alert("Vendor not found");
      return;
    }

    if (isSaving) return;

    const features = getSubscriptionFeatures(van.subscriptionTier);

    if (!name.trim() || !vendorName.trim() || !cuisine.trim()) {
      Alert.alert(
        "Missing details",
        "Please make sure van name, vendor name, and cuisine are filled in."
      );
      return;
    }

    const user = await getCurrentUser();

    if (!user || user.id !== van.owner_id || van.isSuspended) {
      Alert.alert(
        "Access denied",
        "This listing is unavailable or you do not have permission to edit it."
      );
      return;
    }

    setIsSaving(true);

    try {
      let nextPhotos: string[] = [];
      let nextLogoUri: string | null = logoUri;
      let nextLogoPath: string | null = logoPath;
      let nextMenuPdfStoragePath: string | null = null;
      let nextMenuPdfName: string | null = null;
      let nextMenuPdfUri: string | null = null;

      if (features.images) {
        const existingRemotePhotos = photos.filter((uri) => !isLocalFileUri(uri));
        const localPhotos = photos.filter((uri) => isLocalFileUri(uri));

        const uniqueLocalPhotos = Array.from(new Set(localPhotos));

        const uploadedPhotoUrls =
          uniqueLocalPhotos.length > 0
            ? await uploadVendorPhotos(user.id, uniqueLocalPhotos)
            : [];

        nextPhotos = [...existingRemotePhotos, ...uploadedPhotoUrls].slice(0, 8);

        if (logoUri) {
          const isExistingStoredLogo = !!logoPath && !isLocalFileUri(logoUri);

          if (!isExistingStoredLogo) {
            const uploadedLogo = await uploadVendorLogo(user.id, logoUri);
            nextLogoUri = uploadedLogo.publicUrl;
            nextLogoPath = uploadedLogo.storagePath;
          }
        } else {
          nextLogoUri = null;
          nextLogoPath = null;
        }

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
        } else {
          nextMenuPdfStoragePath = null;
          nextMenuPdfName = null;
          nextMenuPdfUri = null;
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
          photo: features.images
            ? nextPhotos[0] ?? van.photo ?? null
            : null,
          photos: features.images ? nextPhotos : [],
          logo_url: features.images ? nextLogoUri : null,
          logo_path: features.images ? nextLogoPath : null,
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
      setLogoUri(nextLogoUri);
      setLogoPath(nextLogoPath);
      setMenuPdfName(nextMenuPdfName);
      setMenuPdfUri(nextMenuPdfUri);
      setMenuPdfStoragePath(nextMenuPdfStoragePath);

      const updatedVan: AssetAwareVan = {
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
        logoUrl: features.images ? nextLogoUri : null,
        logoPath: features.images ? nextLogoPath : null,
        menuPdfUrl: features.images ? nextMenuPdfStoragePath : null,
        menuPdfName: features.images ? nextMenuPdfName : null,
        lat,
        lng,
      };

      setVan(updatedVan);

      await Promise.all([
        loadAdvancedInsights(
          updatedVan.id,
          updatedVan.subscriptionTier ?? "free"
        ),
        loadHeatmapPoints(
          updatedVan.id,
          updatedVan.subscriptionTier ?? "free"
        ),
      ]);

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
          This vendor listing is unavailable, suspended, or not assigned to your
          account.
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
      ? "Unlock advanced analytics, stronger branding, and a more premium presence."
      : "Unlock increased visibility, logo branding, listing photos, and stronger customer trust.";

  const upgradeButtonText =
    van.subscriptionTier === "growth" ? "Upgrade to Pro" : "Upgrade to Growth";

  const filteredFoodCategoryOptions = FOOD_CATEGORY_OPTIONS.filter((category) =>
    category.toLowerCase().includes(foodCategorySearch.trim().toLowerCase())
  );

  const conversionRate =
    (van.views ?? 0) > 0
      ? (((van.directions ?? 0) / (van.views ?? 0)) * 100).toFixed(1)
      : "0.0";

  const hasLogo = !!logoUri;

  const proVisualSupport =
    van.subscriptionTier === "pro"
      ? "Your Pro plan gives your dashboard a premium look and access to deeper performance insights."
      : van.subscriptionTier === "growth"
        ? "Growth helps you look more established with branding and stronger visibility tools."
        : "Free gets you listed. Growth and Pro are built to help you stand out more.";

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
              Manage your listing, track performance, and sharpen your customer
              presence.
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.accountIconButton}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.accountIconText}>🏠</Text>
            </Pressable>

            <Pressable
              style={styles.accountIconButton}
              onPress={() => router.replace("/(tabs)/account")}
            >
              <Text style={styles.accountIconText}>⚙️</Text>
            </Pressable>
          </View>
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

      <View
        style={[
          styles.summaryCard,
          van.subscriptionTier === "pro" && styles.proSummaryCard,
        ]}
      >
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
                  {features.liveStatus
                    ? isLive
                      ? "LIVE"
                      : "OFFLINE"
                    : "LISTED"}
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

            <Text style={styles.proVisualSupport}>{proVisualSupport}</Text>
          </View>

          {hasLogo ? (
            <Image source={{ uri: logoUri! }} style={styles.logoImage} />
          ) : features.images && photos[0] ? (
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
            <Text style={styles.summaryStatLabel}>Directions</Text>
            <Text style={styles.summaryStatValue}>{van.directions ?? 0}</Text>
          </View>

          <View style={styles.summaryStatPill}>
            <Text style={styles.summaryStatLabel}>Conversion</Text>
            <Text style={styles.summaryStatValue}>{conversionRate}%</Text>
          </View>
        </View>
      </View>

      {van.subscriptionTier !== "pro" && (
        <View style={styles.pressureCard}>
          <Text style={styles.pressureText}>
            You’re getting views — upgrade to reach more customers and increase
            conversions.
          </Text>
        </View>
      )}

      {van.subscriptionTier === "pro" ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Performance Insights</Text>
            <Text style={styles.sectionSubtitle}>
              Understand how customers interact with your listing.
            </Text>
          </View>

          {insightsLoading ? (
            <View style={styles.cardBox}>
              <Text style={styles.loadingInlineText}>Loading insights...</Text>
            </View>
          ) : (
            <>
              <TrendsMiniChart
                title="Trends Over Time"
                subtitle="Daily views over the last 30 days"
                points={insights?.daily_views ?? []}
              />

              <PeakHoursChart
                title="Peak Hours"
                subtitle="When customers engage most"
                points={insights?.peak_hours ?? []}
              />

              <View style={styles.insightCard}>
                <Text style={styles.insightCardTitle}>Heat Map</Text>
                <Text style={styles.insightCardSubtitle}>
                  Where your recent customer activity is coming from.
                </Text>

                {heatmapLoading ? (
                  <View style={styles.emptyInlineCard}>
                    <Text style={styles.emptyInlineTitle}>Loading heat map...</Text>
                    <Text style={styles.emptyInlineText}>
                      Pulling recent location activity for your listing.
                    </Text>
                  </View>
                ) : heatmapPoints.length === 0 ? (
                  <View style={styles.emptyInlineCard}>
                    <Text style={styles.emptyInlineTitle}>No heat map data yet</Text>
                    <Text style={styles.emptyInlineText}>
                      Heat map points will appear once customer interactions are recorded with location data.
                    </Text>
                  </View>
                ) : (
                  <>
                    <MapView
                      style={styles.heatmapMap}
                      pointerEvents="none"
                      initialRegion={{
                        latitude: lat || van.lat,
                        longitude: lng || van.lng,
                        latitudeDelta: 0.12,
                        longitudeDelta: 0.12,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      rotateEnabled={false}
                      pitchEnabled={false}
                      toolbarEnabled={false}
                    >
                      <Marker
                        coordinate={{
                          latitude: lat || van.lat,
                          longitude: lng || van.lng,
                        }}
                        title={van.name}
                        pinColor="#0B2A5B"
                      />

                      {heatmapPoints.map((point, index) => (
                        <Marker
                          key={`${point.lat}-${point.lng}-${index}`}
                          coordinate={{
                            latitude: point.lat,
                            longitude: point.lng,
                          }}
                          anchor={{ x: 0.5, y: 0.5 }}
                        >
                          <View
                            style={[
                              styles.heatmapVisualDot,
                              point.weight >= 8
                                ? styles.heatmapVisualDotHot
                                : point.weight >= 4
                                  ? styles.heatmapVisualDotWarm
                                  : styles.heatmapVisualDotCool,
                            ]}
                          >
                            <Text style={styles.heatmapVisualDotText}>
                              {point.weight}
                            </Text>
                          </View>
                        </Marker>
                      ))}
                    </MapView>

                    <View style={styles.heatmapLegend}>
                      <View style={styles.heatmapLegendItem}>
                        <View style={[styles.heatmapLegendDot, styles.heatmapDotCool]} />
                        <Text style={styles.heatmapLegendText}>Low activity</Text>
                      </View>

                      <View style={styles.heatmapLegendItem}>
                        <View style={[styles.heatmapLegendDot, styles.heatmapDotWarm]} />
                        <Text style={styles.heatmapLegendText}>Medium activity</Text>
                      </View>

                      <View style={styles.heatmapLegendItem}>
                        <View style={[styles.heatmapLegendDot, styles.heatmapDotHot]} />
                        <Text style={styles.heatmapLegendText}>High activity</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </>
          )}
        </>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Performance Insights</Text>
            <Text style={styles.sectionSubtitle}>
              Pro unlocks deeper vendor intelligence.
            </Text>
          </View>

          <View style={styles.inlineLockedCard}>
            <Text style={styles.inlineLockedTitle}>Pro feature</Text>
            <Text style={styles.inlineLockedText}>
              Unlock advanced analytics, peak hours, and customer trends.
            </Text>
          </View>
        </>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Branding</Text>
        <Text style={styles.sectionSubtitle}>
          Build a stronger identity for your business.
        </Text>
      </View>

      <View style={styles.cardBox}>
        {van.subscriptionTier === "free" ? (
          <View style={styles.inlineLockedCard}>
            <Text style={styles.inlineLockedTitle}>Growth required</Text>
            <Text style={styles.inlineLockedText}>
              Add your logo to build trust and stand out.
            </Text>
          </View>
        ) : (
          <>
            <Pressable style={styles.softButton} onPress={pickLogo}>
              <Text style={styles.softButtonText}>
                {logoUri ? "Replace Logo" : "Upload Logo"}
              </Text>
            </Pressable>

            {logoUri ? (
              <View style={styles.logoPreview}>
                <Image source={{ uri: logoUri }} style={styles.logoLarge} />

                <Pressable
                  style={styles.galleryDeleteButton}
                  onPress={removeLogo}
                >
                  <Text style={styles.galleryDeleteButtonText}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptyAssetBox}>
                <Text style={styles.emptyAssetTitle}>No logo uploaded yet</Text>
                <Text style={styles.emptyAssetText}>
                  Add a square logo to strengthen your brand identity.
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tier Growth</Text>
        <Text style={styles.sectionSubtitle}>
          See what your next plan unlocks for your business.
        </Text>
      </View>

      {van.subscriptionTier !== "pro" ? (
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
                <Text style={styles.upgradeFeature}>• Upload your logo</Text>
                <Text style={styles.upgradeFeature}>• Use live status</Text>
                <Text style={styles.upgradeFeature}>
                  • Build stronger customer trust
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.upgradeFeature}>
                  • Unlock advanced analytics
                </Text>
                <Text style={styles.upgradeFeature}>
                  • See trends over time
                </Text>
                <Text style={styles.upgradeFeature}>
                  • Discover your peak hours
                </Text>
                <Text style={styles.upgradeFeature}>
                  • Access premium performance tools
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
      ) : (
        <View style={styles.cardBox}>
          <Text style={styles.proNoteTitle}>Pro Active</Text>
          <Text style={styles.proNoteText}>
            You have access to premium analytics, stronger branding, and the
            most advanced vendor tools currently available.
          </Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Plan Guide</Text>
        <Text style={styles.sectionSubtitle}>
          Understand what each subscription tier unlocks.
        </Text>
      </View>

      <View style={styles.cardBox}>
        <TierExplanationCard
          title="Free — Get listed"
          subtitle="Basic presence"
          accent="free"
          isExpanded={expandedTier === "free"}
          onToggle={() => setExpandedTier("free")}
        >
          <Text style={styles.tierItem}>• Listing visibility</Text>
          <Text style={styles.tierItem}>• Basic views and directions</Text>
          <Text style={styles.tierItem}>• Standard map presence</Text>
        </TierExplanationCard>

        <TierExplanationCard
          title="Growth — Get found"
          subtitle="Improve visibility"
          accent="growth"
          isExpanded={expandedTier === "growth"}
          onToggle={() => setExpandedTier("growth")}
        >
          <Text style={styles.tierItem}>• Photo gallery</Text>
          <Text style={styles.tierItem}>• Logo branding</Text>
          <Text style={styles.tierItem}>• Live status</Text>
          <Text style={styles.tierItem}>• Stronger customer trust</Text>
        </TierExplanationCard>

        <TierExplanationCard
          title="Pro — Stand out"
          subtitle="Premium performance tools"
          accent="pro"
          isExpanded={expandedTier === "pro"}
          onToggle={() => setExpandedTier("pro")}
        >
          <Text style={styles.tierItem}>• Advanced analytics</Text>
          <Text style={styles.tierItem}>• Conversion tracking</Text>
          <Text style={styles.tierItem}>• Trends over time</Text>
          <Text style={styles.tierItem}>• Peak hours insights</Text>
          <Text style={styles.tierItem}>• Heat map insights</Text>
        </TierExplanationCard>
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
              onPress={() => handleLiveToggle(!isLive)}
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
          <Text style={styles.healthValue}>
            {menu.trim() ? "Added" : "Missing"}
          </Text>
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

        <View style={styles.healthRow}>
          <Text style={styles.healthLabel}>Logo</Text>
          <Text style={styles.healthValue}>
            {van.subscriptionTier === "free"
              ? "Growth required"
              : hasLogo
                ? "Added"
                : "Missing"}
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
                    onPress={openMenuPdfFromDashboard}
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

      >
        <Text style={styles.sectionTitle}>Edit Listing</Text>
        <Text style={styles.sectionSubtitle}>
          Update the details customers see on your public profile.
        </Text>
      </View>

      <View
        style={styles.cardBox}
        onLayout={(event) => setEditSectionY(event.nativeEvent.layout.y)}
      >
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
        <TextInput
          style={styles.input}
          value={foodCategorySearch}
          onChangeText={setFoodCategorySearch}
          placeholder="Search food categories"
          placeholderTextColor="#7A7A7A"
        />

        <View style={styles.checkboxGroup}>
          {filteredFoodCategoryOptions.map((category) => {
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

        {filteredFoodCategoryOptions.length === 0 ? (
          <Text style={styles.categorySearchEmptyText}>
            No matching categories found.
          </Text>
        ) : null}

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
            <Switch
              value={isLive}
              onValueChange={(value) => handleLiveToggle(value)}
            />
          </View>
        ) : (
          <View style={styles.liveRow}>
            <Text style={styles.liveLabel}>Live now</Text>
            <Text style={styles.liveLockedText}>Growth required</Text>
          </View>
        )}

        <Pressable
          style={[styles.primaryButton, isSaving && { opacity: 0.7 }]}
          onPress={() => {
            if (!isSaving) saveChanges();
          }}
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

  loadingInlineText: {
    fontSize: 14,
    color: "#5F6368",
    fontWeight: "700",
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

  headerActions: {
    flexDirection: "row",
    gap: 10,
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: thinOrange,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  proSummaryCard: {
    borderColor: "#FFB357",
    shadowColor: "#FF7A00",
    shadowOpacity: 0.2,
    shadowRadius: 16,
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

  pressureCard: {
    backgroundColor: "#FFF4E8",
    borderRadius: 18,
    padding: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#FFD1A6",
  },

  pressureText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8A4B00",
    lineHeight: 20,
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

  logoImage: {
    width: 82,
    height: 82,
    borderRadius: 18,
    backgroundColor: "#F5F7FA",
  },

  logoLarge: {
    width: 120,
    height: 120,
    borderRadius: 24,
    alignSelf: "center",
    marginTop: 12,
    backgroundColor: "#F5F7FA",
  },

  logoPreview: {
    alignItems: "center",
    marginTop: 10,
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
    marginBottom: 8,
  },

  proVisualSupport: {
    fontSize: 13,
    color: "#8A4B00",
    lineHeight: 19,
    fontWeight: "700",
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

  insightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: thinOrange,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  insightCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },

  insightCardSubtitle: {
    fontSize: 13,
    color: "#5F6368",
    lineHeight: 19,
    marginBottom: 14,
  },

  trendChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 128,
    marginTop: 4,
  },

  trendBarWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  trendBarTrack: {
    width: "100%",
    height: 120,
    justifyContent: "flex-end",
    alignItems: "center",
  },

  trendBarFill: {
    width: "100%",
    borderRadius: 999,
    backgroundColor: "#FF7A00",
    minHeight: 4,
  },

  trendAxisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  trendAxisLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5F6368",
  },

  hourChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 146,
    marginTop: 4,
  },

  hourBarWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  hourBarTrack: {
    width: "100%",
    height: 120,
    justifyContent: "flex-end",
    alignItems: "center",
  },

  hourBarFill: {
    width: "100%",
    borderRadius: 999,
    backgroundColor: "#FF7A00",
    minHeight: 4,
  },

  hourAxisLabel: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: "700",
    color: "#5F6368",
    textAlign: "center",
  },

  hourAxisSpacer: {
    marginTop: 8,
    height: 12,
  },

  heatmapList: {
    gap: 10,
  },

  heatmapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },

  heatmapDotWrap: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  heatmapDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },

  heatmapDotCool: {
    backgroundColor: "#8FB3E8",
  },

  heatmapDotWarm: {
    backgroundColor: "#FFB067",
  },

  heatmapDotHot: {
    backgroundColor: "#FF7A00",
  },

  heatmapTextWrap: {
    flex: 1,
  },

  heatmapCoords: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 2,
  },

  heatmapMeta: {
    fontSize: 13,
    color: "#5F6368",
    lineHeight: 18,
  },

  heatmapMap: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
  },

  heatmapVisualDot: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  heatmapVisualDotCool: {
    backgroundColor: "#8FB3E8",
  },

  heatmapVisualDotWarm: {
    backgroundColor: "#FFB067",
  },

  heatmapVisualDotHot: {
    backgroundColor: "#FF7A00",
  },

  heatmapVisualDotText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  heatmapLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  heatmapLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  heatmapLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },

  heatmapLegendText: {
    fontSize: 12,
    color: "#5F6368",
    fontWeight: "700",
  },

  emptyInlineCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  emptyInlineTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },

  emptyInlineText: {
    fontSize: 14,
    color: "#5F6368",
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

  tierExplainCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  tierExplainCardGrowth: {
    borderColor: "#C9D9F6",
    backgroundColor: "#F4F8FF",
  },

  tierExplainCardPro: {
    borderColor: "#FFD3AD",
    backgroundColor: "#FFF8F1",
  },

  tierExplainHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  tierExplainTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 2,
  },

  tierExplainSubtitle: {
    fontSize: 13,
    color: "#5F6368",
    lineHeight: 18,
  },

  tierExplainToggle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0B2A5B",
    marginLeft: 10,
  },

  tierExplainBody: {
    marginTop: 12,
    gap: 6,
  },

  tierItem: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
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

  categorySearchEmptyText: {
    fontSize: 14,
    color: "#5F6368",
    marginBottom: 16,
    fontWeight: "600",
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
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
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