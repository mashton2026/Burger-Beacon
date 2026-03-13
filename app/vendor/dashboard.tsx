import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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

const CUSTOM_VANS_KEY = "bitebeacon_custom_vans";

type Van = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number;
  cuisine: string;
  temporary?: boolean;
  photo?: string | null;
  vendorName?: string;
  menu?: string;
  schedule?: string;
  isLive?: boolean;
  views?: number;
  directions?: number;
};

export default function VendorDashboardScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [van, setVan] = useState<Van | null>(null);

  const [name, setName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [menu, setMenu] = useState("");
  const [schedule, setSchedule] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    loadVan();
  }, [id]);

  async function loadVan() {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_VANS_KEY);
      const parsed: Van[] = stored ? JSON.parse(stored) : [];
      const foundVan = parsed.find((item) => item.id === id) ?? null;

      if (!foundVan) {
        setVan(null);
        setLoading(false);
        return;
      }

      setVan(foundVan);
      setName(foundVan.name ?? "");
      setVendorName(foundVan.vendorName ?? "");
      setCuisine(foundVan.cuisine ?? "");
      setMenu(foundVan.menu ?? "");
      setSchedule(foundVan.schedule ?? "");
      setPhoto(foundVan.photo ?? null);
      setIsLive(!!foundVan.isLive);
      setLoading(false);
    } catch {
      setVan(null);
      setLoading(false);
    }
  }

  async function pickPhoto() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to upload a vendor photo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  }

  async function saveChanges() {
    if (!van) {
      Alert.alert("Vendor not found");
      return;
    }

    if (!name.trim() || !vendorName.trim() || !cuisine.trim()) {
      Alert.alert(
        "Missing details",
        "Please make sure van name, vendor name, and cuisine are filled in."
      );
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(CUSTOM_VANS_KEY);
      const parsed: Van[] = stored ? JSON.parse(stored) : [];

      const updatedVans = parsed.map((item) =>
        item.id === van.id
          ? {
            ...item,
            name: name.trim(),
            vendorName: vendorName.trim(),
            cuisine: cuisine.trim(),
            menu: menu.trim() || "Menu coming soon",
            schedule: schedule.trim() || "Schedule coming soon",
            photo,
            isLive,
          }
          : item
      );

      await AsyncStorage.setItem(CUSTOM_VANS_KEY, JSON.stringify(updatedVans));

      Alert.alert("Saved", "Your vendor listing has been updated.");

      router.replace({
        pathname: "/vendor/[id]",
        params: {
          id: van.id,
        },
      });
    } catch {
      Alert.alert("Save failed", "Something went wrong while saving changes.");
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
            try {
              const stored = await AsyncStorage.getItem(CUSTOM_VANS_KEY);
              const parsed: Van[] = stored ? JSON.parse(stored) : [];

              const updatedVans = parsed.filter((item) => item.id !== van.id);

              await AsyncStorage.setItem(
                CUSTOM_VANS_KEY,
                JSON.stringify(updatedVans)
              );

              Alert.alert("Deleted", "Your vendor listing has been removed.");

              router.replace("/explore");
            } catch {
              Alert.alert(
                "Delete failed",
                "Something went wrong while deleting the listing."
              );
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!van) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundTitle}>Vendor not found</Text>

        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Vendor Dashboard</Text>
      <Text style={styles.subtitle}>
        Manage your BiteBeacon listing in one place.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{van.name}</Text>
        <Text style={styles.cardMeta}>⭐ {van.rating.toFixed(1)}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Rating</Text>
          <Text style={styles.statValue}>{van.rating.toFixed(1)}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Status</Text>
          <Text style={styles.statValue}>{isLive ? "LIVE" : "OFFLINE"}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Views</Text>
          <Text style={styles.statValue}>{van.views ?? 0}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Directions</Text>
          <Text style={styles.statValue}>{van.directions ?? 0}</Text>
        </View>
      </View>
      <View style={styles.healthCard}>
  <Text style={styles.healthTitle}>Listing Health</Text>
  <Text style={styles.healthSummary}>
  {photo && menu.trim() && schedule.trim()
    ? "Ready to publish"
    : "Needs attention"}
</Text>

  <View style={styles.healthRow}>
    <Text style={styles.healthLabel}>Status</Text>
    <Text style={styles.healthValue}>{isLive ? "LIVE" : "OFFLINE"}</Text>
  </View>

  <View style={styles.healthRow}>
    <Text style={styles.healthLabel}>Photo</Text>
    <Text style={styles.healthValue}>{photo ? "Added" : "Missing"}</Text>
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
</View>
<View style={styles.quickActionsCard}>
  <Text style={styles.quickActionsTitle}>Quick Actions</Text>

  <View style={styles.quickActionsRow}>
    <Pressable
      style={styles.quickActionButton}
      onPress={() => setIsLive((current) => !current)}
    >
      <Text style={styles.quickActionButtonText}>
        {isLive ? "Go OFFLINE" : "Go LIVE"}
      </Text>
    </Pressable>

    <Pressable
      style={styles.quickActionButton}
      onPress={() =>
        router.push({
          pathname: "/vendor/[id]",
          params: { id: van.id },
        })
      }
    >
      <Text style={styles.quickActionButtonText}>View Listing</Text>
    </Pressable>
  </View>

  <View style={styles.quickActionsRow}>
    <Pressable
      style={styles.quickActionButton}
      onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${van.lat},${van.lng}`)}
    >
      <Text style={styles.quickActionButtonText}>Get Directions</Text>
    </Pressable>
  </View>
</View>

      <Text style={styles.label}>Van name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Van name"
      />

      <Text style={styles.label}>Vendor name</Text>
      <TextInput
        style={styles.input}
        value={vendorName}
        onChangeText={setVendorName}
        placeholder="Vendor name"
      />

      <Text style={styles.label}>Cuisine</Text>
      <TextInput
        style={styles.input}
        value={cuisine}
        onChangeText={setCuisine}
        placeholder="Cuisine"
      />

      <Text style={styles.label}>Menu</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={menu}
        onChangeText={setMenu}
        placeholder="Menu"
        multiline
      />

      <Text style={styles.label}>Schedule</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={schedule}
        onChangeText={setSchedule}
        placeholder="Weekly schedule"
        multiline
      />

      <View style={styles.liveRow}>
        <Text style={styles.liveLabel}>LIVE NOW</Text>
        <Switch value={isLive} onValueChange={setIsLive} />
      </View>

      <Pressable style={styles.secondaryButton} onPress={pickPhoto}>
        <Text style={styles.secondaryButtonText}>Upload Photo</Text>
      </Pressable>

      {photo ? <Image source={{ uri: photo }} style={styles.previewImage} /> : null}

      <Pressable style={styles.primaryButton} onPress={saveChanges}>
        <Text style={styles.primaryButtonText}>Save Changes</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() =>
          router.replace({
            pathname: "/vendor/[id]",
            params: { id: van.id },
          })
        }
      >
        <Text style={styles.secondaryButtonText}>Back to Vendor Page</Text>
      </Pressable>

      <Pressable style={styles.deleteButton} onPress={deleteListing}>
        <Text style={styles.deleteButtonText}>Delete Listing</Text>
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
    paddingTop: 40,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    backgroundColor: "#F7F4F2",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B2A5B",
  },

  notFoundTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 16,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#5F6368",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#D9D9D9",
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },

  cardMeta: {
    fontSize: 14,
    color: "#5F6368",
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0B2A5B",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },

  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },

  liveRow: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  liveLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B2A5B",
  },

  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#EAEAEA",
  },

  primaryButton: {
    backgroundColor: "#0B2A5B",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryButton: {
    backgroundColor: "#D9D9D9",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },

  secondaryButtonText: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },

  deleteButton: {
    backgroundColor: "#C62828",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },

  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D9D9D9",
  },

  statLabel: {
    fontSize: 13,
    color: "#5F6368",
    marginBottom: 6,
    fontWeight: "600",
  },

  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0B2A5B",
  },
  healthCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 16,
  borderWidth: 1,
  borderColor: "#D9D9D9",
  marginBottom: 16,
},

healthTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: "#0B2A5B",
  marginBottom: 12,
},

healthRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderBottomColor: "#EFEFEF",
},

healthLabel: {
  fontSize: 14,
  color: "#5F6368",
  fontWeight: "600",
},

healthValue: {
  fontSize: 14,
  color: "#0B2A5B",
  fontWeight: "700",
},
quickActionsCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 16,
  borderWidth: 1,
  borderColor: "#D9D9D9",
  marginBottom: 16,
},

quickActionsTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: "#0B2A5B",
  marginBottom: 12,
},

quickActionsRow: {
  flexDirection: "row",
  gap: 12,
  marginBottom: 12,
},

quickActionButton: {
  flex: 1,
  backgroundColor: "#0B2A5B",
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: "center",
  justifyContent: "center",
},

quickActionButtonText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "700",
},
healthSummary: {
  fontSize: 14,
  color: "#5F6368",
  marginBottom: 12,
  fontWeight: "600",
},
});