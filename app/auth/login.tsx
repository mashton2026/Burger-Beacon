import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { theme } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { getCurrentUser } from "../../services/authService";
import { getMyVendorClaims } from "../../services/vendorClaimService";
import { getVendorByOwnerId } from "../../services/vendorService";

export default function VendorLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      Alert.alert("Login failed", error.message);
      return;
    }

    const user = await getCurrentUser();

    if (!user) {
      Alert.alert("Error", "Could not load vendor account.");
      return;
    }

    try {
      const vendor = await getVendorByOwnerId(user.id);

      if (vendor) {
        router.replace({
          pathname: "/vendor/dashboard",
          params: { id: vendor.id },
        });
        return;
      }

      const claims = await getMyVendorClaims(user.id);

      if (claims.length > 0) {
        router.replace("/vendor/dashboard");
        return;
      }

      router.replace("/vendor/claim-select");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.heroBlock}>
        <Text style={styles.kicker}>VENDOR PORTAL</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Log in to manage your BiteBeacon listing, keep your van live, and stay
          visible to hungry customers.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Vendor Login</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#7A7A7A"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            placeholderTextColor="#7A7A7A"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={styles.showPasswordButton}
            onPress={() => setShowPassword((current) => !current)}
          >
            <Text style={styles.showPasswordButtonText}>
              {showPassword ? "Hide" : "Show"}
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleLogin}>
          <Text style={styles.primaryButtonText}>Log In</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/auth/vendor-signup")}
        >
          <Text style={styles.secondaryButtonText}>Create Vendor Account</Text>
        </Pressable>

        <Pressable
          style={styles.backButton}
          onPress={() => router.replace("/welcome")}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
    justifyContent: "center",
  },

  heroBlock: {
    marginBottom: 24,
  },

  kicker: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: theme.colors.secondary,
    marginBottom: 8,
  },

  title: {
    fontSize: 34,
    fontWeight: "800",
    color: theme.colors.textOnDark,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.78)",
  },

  formCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.background,
    marginBottom: 18,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.background,
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    color: theme.colors.text,
  },

  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 14,
    marginBottom: 18,
    overflow: "hidden",
  },

  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.colors.text,
  },

  showPasswordButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#FFF3E0",
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },

  showPasswordButtonText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },

  primaryButton: {
    backgroundColor: theme.colors.background,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },

  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 16,
    fontWeight: "800",
  },

  secondaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },

  secondaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 16,
    fontWeight: "800",
  },

  backButton: {
    backgroundColor: "#D9D9D9",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },

  backButtonText: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },
});