import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const [isNavigating, setIsNavigating] = useState(false);

  function handleBrowsePress() {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push("/auth/user-gateway");
  }

  function handleVendorPress() {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push("/auth/login");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>BiteBeacon</Text>

        <Text style={styles.subtitle}>
          Discover the best mobile food vendors near you.
        </Text>

        <Pressable
          style={[styles.primaryButton, isNavigating && styles.buttonDisabled]}
          onPress={handleBrowsePress}
          disabled={isNavigating}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>
            {isNavigating ? "Opening..." : "Browse Food Vendors"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, isNavigating && styles.buttonDisabled]}
          onPress={handleVendorPress}
          disabled={isNavigating}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>Vendor Portal</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B2A5B",
  },
  container: {
    flex: 1,
    backgroundColor: "#0B2A5B",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    width: 220,
    height: 220,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 40,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  primaryButtonText: {
    color: "#0B2A5B",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    width: "100%",
    backgroundColor: "#FF7A00",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});