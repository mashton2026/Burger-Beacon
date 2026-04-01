import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";
import { isCurrentUserAdmin } from "../../services/adminService";
import {
  getCurrentUser,
  getCurrentUserScoutPoints,
  getCurrentUserVendor,
  signOutCurrentUser,
} from "../../services/authService";

export default function AccountScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [isVendor, setIsVendor] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [scoutPoints, setScoutPoints] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accountSummaryLoading, setAccountSummaryLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );

  async function loadUser() {
    setLoading(true);
    setAccountSummaryLoading(true);

    const user = await getCurrentUser();

    if (!user) {
      setEmail(null);
      setIsVendor(false);
      setVendorId(null);
      setScoutPoints(0);
      setAccountSummaryLoading(false);
      setLoading(false);
      setIsAdmin(false);
      return;
    }

    setEmail(user.email ?? null);
    try {
      const adminStatus = await isCurrentUserAdmin();
      setIsAdmin(adminStatus);
    } catch {
      setIsAdmin(false);
    }

    try {
      const [points, vendor] = await Promise.all([
        getCurrentUserScoutPoints(),
        getCurrentUserVendor(),
      ]);

      setScoutPoints(points);

      if (vendor) {
        if (vendor.isSuspended) {
          setIsVendor(false);
          setVendorId(null);
          setLoading(false);
          return;
        }

        setIsVendor(true);
        setVendorId(vendor.id);
        setAccountSummaryLoading(false);
        setLoading(false);
        return;
      }

      setIsVendor(false);
      setVendorId(null);
      setAccountSummaryLoading(false);
    } catch {
      setScoutPoints(0);
      setIsVendor(false);
      setVendorId(null);
      setAccountSummaryLoading(false);
    }

    setLoading(false);
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Account</Text>

      <Text style={styles.subtitle}>
        {email ? `Signed in as ${email}` : "Browsing as a guest"}
      </Text>

      {email && (
        <Pressable
          style={[
            styles.vendorDashboardCard,
            !vendorId && styles.vendorDashboardCardDisabled,
          ]}
          onPress={() => {
            if (!vendorId) return;

            router.push({
              pathname: "/vendor/dashboard",
              params: { id: vendorId },
            });
          }}
          disabled={!vendorId}
        >
          <Text style={styles.vendorDashboardEyebrow}>Vendor Dashboard</Text>
          <Text style={styles.vendorDashboardTitle}>
            {accountSummaryLoading ? "Loading vendor tools..." : "Manage your listing"}
          </Text>
          <Text style={styles.vendorDashboardText}>
            {accountSummaryLoading
              ? "Checking your vendor access and loading your dashboard tools."
              : "Manage your listing, analytics and content."}
          </Text>
        </Pressable>
      )}

      {email && (
        <View style={styles.scoutCard}>
          <Text style={styles.scoutCardEyebrow}>Scout Progress</Text>
          <Text style={styles.scoutCardTitle}>
            {accountSummaryLoading
              ? "Loading scout progress..."
              : `${scoutPoints} Scout Point${scoutPoints === 1 ? "" : "s"}`}
          </Text>
          <Text style={styles.scoutCardText}>
            Earn points when vendors claim listings you originally spotted.
          </Text>
        </View>
      )}

      {!email && (
        <>
          <Section title="Get Started" />

          <Row
            label="User Login"
            onPress={() => router.push("/auth/user-login")}
          />

          <Row
            label="Create Account"
            onPress={() => router.push("/auth/user-signup")}
          />

          <Row
            label="Vendor Portal"
            onPress={() => router.push("/auth/login")}
          />

          <Section title="Help & Support" />

          <Row
            label="Contact BiteBeacon Support"
            onPress={() => router.push("/account/help")}
          />

          <Section title="Legal" />

          <Row
            label="Terms & Conditions"
            onPress={() => router.push("/account/terms")}
          />

          <Row
            label="Privacy Policy"
            onPress={() => router.push("/account/privacy")}
          />
        </>
      )}

      {email && !isVendor && !isAdmin && (
        <>
          <Section title="Your Activity" />

          <Row
            label="Favourites"
            onPress={() => router.push("/(tabs)/favourites")}
          />

          <Row
            label="Explore Map"
            onPress={() => router.push("/(tabs)/explore")}
          />

          <Section title="Security" />

          <Row
            label="Account Settings"
            onPress={() => router.push("/account/security")}
          />

          <Section title="Help & Support" />

          <Row
            label="Contact BiteBeacon Support"
            onPress={() => router.push("/account/help")}
          />

          <Section title="Legal" />

          <Row
            label="Terms & Conditions"
            onPress={() => router.push("/account/terms")}
          />

          <Row
            label="Privacy Policy"
            onPress={() => router.push("/account/privacy")}
          />

          <LogoutButton onPress={handleLogout} />
        </>
      )}

      {email && isVendor && !isAdmin && (
        <>
          <Section title="Vendor Tools" />

          {vendorId && (
            <Row
              label="Dashboard"
              onPress={() =>
                router.push({
                  pathname: "/vendor/dashboard",
                  params: { id: vendorId },
                })
              }
            />
          )}

          {vendorId && (
            <Row
              label="View Listing"
              onPress={() =>
                router.push({
                  pathname: "/vendor/[id]",
                  params: { id: vendorId },
                })
              }
            />
          )}

          <Section title="Security" />

          <Row
            label="Account Settings"
            onPress={() => router.push("/account/security")}
          />

          <Section title="Help & Support" />

          <Row
            label="Contact BiteBeacon Support"
            onPress={() => router.push("/account/help")}
          />

          <Section title="Legal" />

          <Row
            label="Terms & Conditions"
            onPress={() => router.push("/account/terms")}
          />

          <Row
            label="Privacy Policy"
            onPress={() => router.push("/account/privacy")}
          />

          <LogoutButton onPress={handleLogout} />
        </>
      )}

      {email && isAdmin && (
        <>
          <Section title="Admin" />
          <Row label="Control Centre" onPress={() => router.push("/admin")} />

          {vendorId && (
            <>
              <Section title="Vendor Tools" />
              <Row
                label="Dashboard"
                onPress={() =>
                  router.push({
                    pathname: "/vendor/dashboard",
                    params: { id: vendorId },
                  })
                }
              />
              <Row
                label="View Listing"
                onPress={() =>
                  router.push({
                    pathname: "/vendor/[id]",
                    params: { id: vendorId },
                  })
                }
              />
            </>
          )}

          <Section title="Security" />
          <Row
            label="Account Settings"
            onPress={() => router.push("/account/security")}
          />
          <Section title="Help & Support" />
          <Row
            label="Contact BiteBeacon Support"
            onPress={() => router.push("/account/help")}
          />
          <Section title="Legal" />
          <Row
            label="Terms & Conditions"
            onPress={() => router.push("/account/terms")}
          />
          <Row
            label="Privacy Policy"
            onPress={() => router.push("/account/privacy")}
          />
          <LogoutButton onPress={handleLogout} />
        </>
      )}
    </ScrollView>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

function Row({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.rowText}>{label}</Text>
    </Pressable>
  );
}

function LogoutButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.logoutButton} onPress={onPress}>
      <Text style={styles.logoutText}>Log Out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 20,
  },

  scoutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },

  scoutCardEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.secondary,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase",
  },

  scoutCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },

  scoutCardText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#355070",
    fontWeight: "600",
  },

  vendorDashboardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },

  vendorDashboardCardDisabled: {
    opacity: 0.6,
  },

  vendorDashboardEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.secondary,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase",
  },

  vendorDashboardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },

  vendorDashboardText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#355070",
    fontWeight: "600",
  },

  section: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.secondary,
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 1,
  },

  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  rowText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  logoutButton: {
    marginTop: 24,
    backgroundColor: "#C62828",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  logoutText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});