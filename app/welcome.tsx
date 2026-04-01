import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../constants/theme";

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />
      <View style={styles.lineOne} />
      <View style={styles.lineTwo} />
      <View style={styles.lineThree} />
      <View style={styles.lineFour} />

      <View style={styles.dotClusterBottom}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dotAccent} />
      </View>

      <View style={styles.dotClusterMid}>
        <View style={styles.dotSmall} />
        <View style={styles.dotAccentSmall} />
      </View>

      <View style={styles.dotClusterTop}>
        <View style={styles.dotSmall} />
        <View style={styles.dotSmall} />
        <View style={styles.dotAccentSmall} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoCard}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.title}>Putting great food on the map</Text>

        <View style={styles.divider} />

        <Text style={styles.tagline}>
          Discover the best street food, hidden gems, and unique eats in every
          town — from food vans to must-try local favourites.
        </Text>

        <View style={styles.buttonWrap}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/auth/user-gateway")}
          >
            <Text style={styles.primaryButtonText}>Browse Food Vendors</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.secondaryButtonText}>
              Vendor / Admin Portal
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    paddingHorizontal: 24,
    overflow: "hidden",
  },

  content: {
    zIndex: 2,
  },

  bgOrbTop: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  bgOrbBottom: {
    position: "absolute",
    bottom: -100,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  lineOne: {
    position: "absolute",
    top: 220,
    right: 0,
    width: 160,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    transform: [{ rotate: "-25deg" }],
  },

  lineTwo: {
    position: "absolute",
    bottom: 200,
    left: 0,
    width: 180,
    height: 2,
    backgroundColor: "rgba(255,122,0,0.16)",
    transform: [{ rotate: "28deg" }],
  },

  lineThree: {
    position: "absolute",
    bottom: 140,
    right: 30,
    width: 120,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.10)",
    transform: [{ rotate: "-32deg" }],
  },

  lineFour: {
    position: "absolute",
    top: 160,
    right: 18,
    width: 90,
    height: 2,
    backgroundColor: "rgba(255,122,0,0.12)",
    transform: [{ rotate: "-28deg" }],
  },

  dotClusterBottom: {
    position: "absolute",
    bottom: 120,
    right: 50,
    flexDirection: "row",
    gap: 6,
  },

  dotClusterMid: {
    position: "absolute",
    top: 320,
    left: 40,
    flexDirection: "row",
    gap: 5,
  },

  dotClusterTop: {
    position: "absolute",
    top: 185,
    right: 58,
    flexDirection: "row",
    gap: 5,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  dotAccent: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,122,0,0.18)",
  },

  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  dotAccentSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,122,0,0.24)",
  },

  logoCard: {
    backgroundColor: "#173B73",
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#FF7A00",
    overflow: "hidden",
    marginBottom: 26,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  logo: {
    width: "100%",
    height: 220,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 10,
  },

  divider: {
    width: 70,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#FF7A00",
    alignSelf: "center",
    marginBottom: 14,
  },

  tagline: {
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },

  buttonWrap: {
    gap: 14,
  },

  primaryButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    borderRadius: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "800",
  },

  secondaryButton: {
    backgroundColor: "#FF7A00",
    paddingVertical: 18,
    borderRadius: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});