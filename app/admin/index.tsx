import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "../../constants/theme";
import { getCurrentUser } from "../../services/authService";
import { getAllVendors } from "../../services/vendorService";
import { type Van } from "../../types/van";

const ADMIN_EMAILS = ["m.l.ashton2024@gmail.com"];

export default function AdminPanelScreen() {
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Van[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      loadAdminData();
    }, [])
  );

  async function loadAdminData(): Promise<void> {
    setIsLoading(true);

    try {
      const user = await getCurrentUser();
      setCurrentEmail(user?.email ?? null);

      const allVendors = await getAllVendors();
      setVendors(allVendors);
    } catch {
      setVendors([]);
    } finally {
      setIsLoading(false);
    }
  }

  const isAdmin =
    !!currentEmail && ADMIN_EMAILS.includes(currentEmail.toLowerCase());

  const totalVendors = vendors.length;
  const liveVendors = vendors.filter((vendor) => vendor.isLive).length;
  const claimedVendors = vendors.filter((vendor) => !!vendor.owner_id).length;
  const spottedVans = vendors.filter((vendor) => vendor.temporary).length;
  const freeVendors = vendors.filter(
    (vendor) => (vendor.subscriptionTier ?? "free") === "free"
  ).length;
  const growthVendors = vendors.filter(
    (vendor) => vendor.subscriptionTier === "growth"
  ).length;
  const proVendors = vendors.filter(
    (vendor) => vendor.subscriptionTier === "pro"
  ).length;

  if (!isLoading && !isAdmin) {
    return (
      <View style={styles.container}>
        <Text style={styles.kicker}>ADMIN</Text>
        <Text style={styles.title}>Access Restricted</Text>
        <Text style={styles.subtitle}>
          This area is only available to BiteBeacon admin accounts.
        </Text>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.kicker}>ADMIN</Text>
      <Text style={styles.title}>Control Centre</Text>
      <Text style={styles.subtitle}>
        A clean admin home for monitoring vendors, spotted vans, and future
        moderation tools.
      </Text>

      <Text style={styles.sectionTitle}>Platform Summary</Text>

      <View style={styles.statsBlock}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Vendors</Text>
          <Text style={styles.statValue}>{totalVendors}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Live Vendors</Text>
          <Text style={styles.statValue}>{liveVendors}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Claimed Vendors</Text>
          <Text style={styles.statValue}>{claimedVendors}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Spotted Vans</Text>
          <Text style={styles.statValue}>{spottedVans}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Free Tier</Text>
          <Text style={styles.statValue}>{freeVendors}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Growth Tier</Text>
          <Text style={styles.statValue}>{growthVendors}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Pro Tier</Text>
          <Text style={styles.statValue}>{proVendors}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Admin Tools</Text>

      <Pressable
        style={styles.row}
        onPress={() => router.push("/admin/claims")}
      >
        <Text style={styles.rowTitle}>Review Pending Claims</Text>
        <Text style={styles.rowText}>
          Approve or reject ownership requests for community spotted vans.
        </Text>
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() =>
          Alert.alert(
            "Review Spotted Vans",
            "This can be built next after claims moderation is working."
          )
        }
      >
        <Text style={styles.rowTitle}>Review Spotted Vans</Text>
        <Text style={styles.rowText}>
          Future area for checking community-spotted submissions.
        </Text>
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() =>
          Alert.alert(
            "Manage Vendors",
            "Vendor management can be added next in a controlled way."
          )
        }
      >
        <Text style={styles.rowTitle}>Manage Vendors</Text>
        <Text style={styles.rowText}>
          Future area for reviewing and managing vendor listings.
        </Text>
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() =>
          Alert.alert(
            "Manage Subscription Tiers",
            "Tier management should always respect your Free, Growth, and Pro system."
          )
        }
      >
        <Text style={styles.rowTitle}>Manage Subscription Tiers</Text>
        <Text style={styles.rowText}>
          Future area for moving vendors between Free, Growth, and Pro.
        </Text>
      </Pressable>

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
  },

  content: {
    paddingBottom: 40,
  },

  kicker: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.secondary,
    marginBottom: 8,
    letterSpacing: 1.2,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: theme.colors.textOnDark,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 22,
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 12,
  },

  statsBlock: {
    marginBottom: 16,
  },

  statRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  statLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 4,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.textOnDark,
  },

  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textOnDark,
    marginBottom: 6,
  },

  rowText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
  },

  backButton: {
    marginTop: 28,
    backgroundColor: "#D9D9D9",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  backButtonText: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },
});