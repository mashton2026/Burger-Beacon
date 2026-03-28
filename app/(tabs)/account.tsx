import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";
import {
  getCurrentUser,
  getCurrentUserVendor,
  signOutCurrentUser,
} from "../../services/authService";

const ADMIN_EMAILS = ["m.l.ashton2024@gmail.com"];

export default function AccountScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [isVendor, setIsVendor] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );

  async function loadUser() {
    const user = await getCurrentUser();

    if (!user) {
      setEmail(null);
      setIsVendor(false);
      setVendorId(null);
      return;
    }

    setEmail(user.email ?? null);

    try {
      const vendor = await getCurrentUserVendor();

      if (vendor) {
        if (vendor.isSuspended) {
          setIsVendor(false);
          setVendorId(null);
          return;
        }

        setIsVendor(true);
        setVendorId(vendor.id);
        return;
      }

      setIsVendor(false);
      setVendorId(null);
    } catch {
      setIsVendor(false);
      setVendorId(null);
    }
  }

  const isAdmin = !!email && ADMIN_EMAILS.includes(email.toLowerCase());

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
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>

      <Text style={styles.subtitle}>
        {email ? `Signed in as ${email}` : "Browsing as a guest"}
      </Text>

      {email && vendorId && (
        <Pressable
          style={styles.vendorDashboardCard}
          onPress={() =>
            router.push({
              pathname: "/vendor/dashboard",
              params: { id: vendorId },
            })
          }
        >
          <Text style={styles.vendorDashboardEyebrow}>Vendor Dashboard</Text>
          <Text style={styles.vendorDashboardTitle}>Manage your listing</Text>
          <Text style={styles.vendorDashboardText}>
            Manage your listing, analytics and content.
          </Text>
        </Pressable>
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
    </View>
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

  vendorDashboardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
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