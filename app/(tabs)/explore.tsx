import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { MapPressEvent, Marker, Region } from "react-native-maps";
import { mockVans, type Van } from "../../constants/mockVans";

type SpotPin = {
  latitude: number;
  longitude: number;
};

const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const CUSTOM_VANS_KEY = "bitebeacon_custom_vans";

export default function MapScreen() {
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView | null>(null);

  const [spotVisible, setSpotVisible] = useState(false);
  const [spotMode, setSpotMode] = useState(false);
  const [spotName, setSpotName] = useState("");
  const [spotCuisine, setSpotCuisine] = useState("");
  const [spotPhoto, setSpotPhoto] = useState<string | null>(null);
  const [spottedVans, setSpottedVans] = useState<Van[]>([]);
  const [customVans, setCustomVans] = useState<Van[]>([]);
  const [selectedSpotPin, setSelectedSpotPin] = useState<SpotPin | null>(null);
  const [selectedVan, setSelectedVan] = useState<Van | null>(null);
  const [userRegion, setUserRegion] = useState<Region>(DEFAULT_REGION);
  const [locationReady, setLocationReady] = useState(false);

  useEffect(() => {
    requestUserLocation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustomVans();
    }, [])
  );

  useEffect(() => {
    if (params.lat && params.lng) {
      const nextRegion: Region = {
        latitude: Number(params.lat),
        longitude: Number(params.lng),
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setUserRegion(nextRegion);

      setTimeout(() => {
        mapRef.current?.animateToRegion(nextRegion, 1000);
      }, 400);
    }
  }, [params.lat, params.lng]);

  async function requestUserLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setLocationReady(true);
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      setUserRegion({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      setLocationReady(true);
    } catch {
      setLocationReady(true);
    }
  }

  async function loadCustomVans() {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_VANS_KEY);
      if (!stored) return;
      setCustomVans(JSON.parse(stored));
    } catch {}
  }

  const allVans = useMemo(() => {
    return [...mockVans, ...customVans, ...spottedVans];
  }, [customVans, spottedVans]);

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
      500
    );
  }

  function handleMapPress(event: MapPressEvent) {
    if (spotMode) {
      const { latitude, longitude } = event.nativeEvent.coordinate;

      setSelectedSpotPin({ latitude, longitude });
      setSelectedVan(null);
      setSpotMode(false);
      setSpotVisible(true);
      return;
    }

    setSelectedVan(null);
  }

  function startSpotMode() {
    setSelectedVan(null);
    setSpotMode(true);
    setSelectedSpotPin(null);

    Alert.alert("Choose location", "Tap the map where the burger van is.");
  }

  function cancelSpotFlow() {
    setSpotMode(false);
    setSpotVisible(false);
    setSpotName("");
    setSpotCuisine("");
    setSpotPhoto(null);
    setSelectedSpotPin(null);
  }

  async function pickSpotPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setSpotPhoto(result.assets[0].uri);
    }
  }

  function submitSpotVan() {
    if (!spotName.trim()) {
      Alert.alert("Missing name", "Please enter the van name.");
      return;
    }

    if (!selectedSpotPin) {
      Alert.alert("Missing location", "Please choose a location.");
      return;
    }

    const newVan: Van = {
      id: `spotted-${Date.now()}`,
      name: spotName.trim(),
      cuisine: spotCuisine.trim() || "Spotted Van",
      rating: 0,
      lat: selectedSpotPin.latitude,
      lng: selectedSpotPin.longitude,
      temporary: true,
      photo: spotPhoto,
      vendorName: "Community spotted",
      menu: "Claim this burger van to add menu",
      schedule: "Claim to add schedule",
      isLive: false,
    };

    setSpottedVans((current) => [newVan, ...current]);

    cancelSpotFlow();

    Alert.alert("Success", "Temporary van added to map.");
  }

  function openVanPage(van: Van) {
    router.push({
      pathname: "/vendor/[id]",
      params: {
        id: van.id,
        name: van.name,
        cuisine: van.cuisine,
        rating: String(van.rating),
        temporary: van.temporary ? "true" : "false",
        photo: van.photo ?? "",
        vendorName: van.vendorName ?? "",
        menu: van.menu ?? "",
        schedule: van.schedule ?? "",
        lat: String(van.lat),
        lng: String(van.lng),
        isLive: van.isLive ? "true" : "false",
      },
    });
  }

  function recenterMap() {
    mapRef.current?.animateToRegion(userRegion, 600);
  }

  return (
    <View style={styles.container}>
      {locationReady ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={userRegion}
          showsUserLocation
          onPress={handleMapPress}
        >
          {allVans.map((van) => (
            <Marker
              key={van.id}
              coordinate={{ latitude: van.lat, longitude: van.lng }}
              pinColor={
                van.temporary ? "orange" : van.isLive ? "green" : "gray"
              }
              onPress={() => handleMarkerPress(van)}
            />
          ))}

          {selectedSpotPin ? (
            <Marker coordinate={selectedSpotPin} pinColor="gray" />
          ) : null}
        </MapView>
      ) : (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      <Pressable style={styles.recenterButton} onPress={recenterMap}>
        <Text style={styles.recenterButtonText}>📍</Text>
      </Pressable>

      {selectedVan ? (
        <View style={styles.bottomCardWrap}>
          <Pressable
            style={styles.bottomCard}
            onPress={() => openVanPage(selectedVan)}
          >
            {selectedVan.photo ? (
              <Image
                source={{ uri: selectedVan.photo }}
                style={styles.bottomCardImage}
              />
            ) : null}

            <Text style={styles.bottomCardTitle}>{selectedVan.name}</Text>
            <Text style={styles.bottomCardMeta}>{selectedVan.cuisine}</Text>
            <Text style={styles.bottomCardHint}>
              Tap card to open vendor page
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.buttonWrap}>
        <Pressable
          style={styles.secondaryActionButton}
          onPress={() => router.push("/vendor/register")}
        >
          <Text style={styles.secondaryActionButtonText}>
            Register Your Van
          </Text>
        </Pressable>

        <Pressable style={styles.primaryButton} onPress={startSpotMode}>
          <Text style={styles.primaryButtonText}>Spot a Van</Text>
        </Pressable>
      </View>

      <Modal visible={spotVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>Spot a Burger Van</Text>

              <TextInput
                style={styles.input}
                placeholder="Van name"
                value={spotName}
                onChangeText={setSpotName}
              />

              <TextInput
                style={styles.input}
                placeholder="Cuisine"
                value={spotCuisine}
                onChangeText={setSpotCuisine}
              />

              <Pressable style={styles.secondaryButton} onPress={pickSpotPhoto}>
                <Text style={styles.secondaryButtonText}>Choose Photo</Text>
              </Pressable>

              {spotPhoto ? (
                <Image source={{ uri: spotPhoto }} style={styles.previewImage} />
              ) : null}

              <Pressable style={styles.primaryButton} onPress={submitSpotVan}>
                <Text style={styles.primaryButtonText}>Submit Listing</Text>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={cancelSpotFlow}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    fontSize: 16,
    fontWeight: "600",
  },

  recenterButton: {
    position: "absolute",
    right: 20,
    bottom: 170,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },

  recenterButtonText: {
    fontSize: 22,
  },

  bottomCardWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 170,
  },

  bottomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
  },

  bottomCardImage: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    marginBottom: 8,
  },

  bottomCardTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  bottomCardMeta: {
    fontSize: 14,
    color: "#666",
  },

  bottomCardHint: {
    marginTop: 6,
    fontWeight: "700",
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
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  secondaryActionButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0B2A5B",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  secondaryActionButtonText: {
    color: "#0B2A5B",
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: "#F7F4F2",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },

  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    marginBottom: 12,
  },

  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0B2A5B",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  secondaryButtonText: {
    color: "#0B2A5B",
    fontWeight: "700",
  },

  cancelButton: {
    backgroundColor: "#D9D9D9",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  cancelButtonText: {
    fontWeight: "700",
  },
});