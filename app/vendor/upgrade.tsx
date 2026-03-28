import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { getCurrentUserVendor } from "../../services/authService";

export default function UpgradeScreen() {
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleUpgrade(nextTier: "growth" | "pro") {
    if (isUpdating) return;

    setIsUpdating(true);

    try {
      const vendor = await getCurrentUserVendor();

      if (!vendor) {
        Alert.alert("Vendor not found", "Please create or claim a vendor listing first.");
        return;
      }

      const { error } = await supabase
        .from("vendors")
        .update({ subscription_tier: nextTier })
        .eq("id", vendor.id);

      if (error) {
        Alert.alert("Upgrade failed", error.message);
        return;
      }

      Alert.alert(
        "Plan updated",
        nextTier === "growth"
          ? "Your plan has been upgraded to Growth."
          : "Your plan has been upgraded to Pro."
      );

      router.replace({
        pathname: "/vendor/dashboard",
        params: { id: vendor.id },
      });
    } catch (error) {
      Alert.alert(
        "Upgrade failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade Your Plan</Text>

      <Text style={styles.subtitle}>
        Unlock more features and grow your presence on BiteBeacon.
      </Text>

      {/* GROWTH */}
      <View style={styles.card}>
        <Text style={styles.planTitle}>Growth</Text>
        <Text style={styles.planPrice}>£9.99 / month</Text>

        <Text style={styles.feature}>• Go LIVE on the map</Text>
        <Text style={styles.feature}>• Add food categories</Text>
        <Text style={styles.feature}>• Post updates</Text>

        <Pressable
          style={styles.button}
          onPress={() => handleUpgrade("growth")}
          disabled={isUpdating}
        >
          <Text style={styles.buttonText}>
            {isUpdating ? "Updating..." : "Upgrade to Growth"}
          </Text>
        </Pressable>
      </View>

      {/* PRO */}
      <View style={styles.card}>
        <Text style={styles.planTitle}>Pro</Text>
        <Text style={styles.planPrice}>£14.99 / month</Text>

        <Text style={styles.feature}>• Featured placement</Text>
        <Text style={styles.feature}>• Maximum visibility</Text>
        <Text style={styles.feature}>• Full feature access</Text>

        <Pressable
          style={styles.buttonSecondary}
          onPress={() => handleUpgrade("pro")}
          disabled={isUpdating}
        >
          <Text style={styles.buttonSecondaryText}>
            {isUpdating ? "Updating..." : "Upgrade to Pro"}
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B2A5B",
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#FF7A00",
  },

  planTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },

  planPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF7A00",
    marginBottom: 10,
  },

  feature: {
    fontSize: 14,
    marginBottom: 4,
    color: "#333",
  },

  button: {
    marginTop: 10,
    backgroundColor: "#FF7A00",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  buttonSecondary: {
    marginTop: 10,
    backgroundColor: "#0B2A5B",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonSecondaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  backButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#D9D9D9",
  },

  backText: {
    fontWeight: "700",
  },
});