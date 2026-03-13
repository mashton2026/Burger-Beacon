import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
};

export default function RegisterVendorScreen() {
  const params = useLocalSearchParams();
  const [vanName, setVanName] = useState((params.vanName as string) ?? "");
  const [vendorName, setVendorName] = useState("");
  const [cuisine, setCuisine] = useState((params.cuisine as string) ?? "");
  const [menu, setMenu] = useState((params.menu as string) ?? "");
  const [schedule, setSchedule] = useState((params.schedule as string) ?? "");

  async function handleRegister() {
    if (!vanName.trim() || !vendorName.trim() || !cuisine.trim()) {
      Alert.alert(
        "Missing details",
        "Please add the van name, vendor name, and cuisine."
      );
      return;
    }

    const lat = Number(params.lat);
    const lng = Number(params.lng);

    if (!params.lat || !params.lng) {
      Alert.alert("Location required", "Please choose a location on the map.");
      return;
    }

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Alert.alert(
        "Invalid coordinates",
        "Please enter valid latitude and longitude values."
      );
      return;
    }
    const claimId = params.claimId as string | undefined;
    const isClaiming = !!claimId;
    const newVan: Van = {
      id: claimId ? `custom-${claimId}` : `custom-${Date.now()}`,
      name: vanName.trim(),
      vendorName: vendorName.trim(),
      cuisine: cuisine.trim(),
      menu: menu.trim() || "Menu coming soon",
      schedule: schedule.trim() || "Schedule coming soon",
      lat,
      lng,
      rating: 0,
      temporary: false,
      photo: (params.photo as string) || null,
      isLive: false,
    };

    try {
      const existing = await AsyncStorage.getItem(CUSTOM_VANS_KEY);
      const parsed: Van[] = existing ? JSON.parse(existing) : [];
      const updated = [newVan, ...parsed];

      await AsyncStorage.setItem(CUSTOM_VANS_KEY, JSON.stringify(updated));

      Alert.alert("Vendor registered", "Your van has been added to the app.");

      router.replace({
        pathname: "/explore",
        params: {
          lat: String(lat),
          lng: String(lng),
        },
      });
    } catch {
      Alert.alert(
        "Save failed",
        "Something went wrong while saving the vendor."
      );
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {params.claimId ? "Claim This Burger Van" : "Register Your Burger Van"}
      </Text>
      <Text style={styles.subtitle}>
        {params.claimId
          ? "Complete the details below to turn this spotted van into your real vendor listing."
          : "Start your BiteBeacon vendor setup."}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Van name"
        value={vanName}
        onChangeText={setVanName}
      />

      <TextInput
        style={styles.input}
        placeholder="Vendor name"
        value={vendorName}
        onChangeText={setVendorName}
      />

      <TextInput
        style={styles.input}
        placeholder="Cuisine"
        value={cuisine}
        onChangeText={setCuisine}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Menu"
        value={menu}
        onChangeText={setMenu}
        multiline
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Weekly schedule"
        value={schedule}
        onChangeText={setSchedule}
        multiline
      />

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push("/vendor/pick-location")}
      >
        <Text style={styles.secondaryButtonText}>Choose Location on Map</Text>
      </Pressable>

      {params.lat && params.lng ? (
        <Text style={styles.locationChosenText}>
          {params.claimId ? "Spotted van location loaded ✓" : "Location selected ✓"}
        </Text>
      ) : (
        <Text style={styles.locationChosenText}>No location selected yet</Text>
      )}

      <Pressable style={styles.primaryButton} onPress={handleRegister}>
        <Text style={styles.primaryButtonText}>
          {params.claimId ? "Claim Vendor Listing" : "Create Vendor Listing"}
        </Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  locationChosenText: {
    fontSize: 14,
    color: "#5F6368",
    marginBottom: 14,
  },
  container: {
    flex: 1,
    backgroundColor: "#F7F4F2",
  },
  content: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
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
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  primaryButton: {
    backgroundColor: "#0B2A5B",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 6,
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
  },
  secondaryButtonText: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },
});