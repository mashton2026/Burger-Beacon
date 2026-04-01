import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

const { width } = Dimensions.get("window");

const slides = [
  {
    eyebrow: "DISCOVER",
    title: "Food worth travelling for",
    text: "Find top local food, hidden gems and independent favourites across Cornwall — all in one place.",
    icon: "📍",
    pills: ["Burgers", "Seafood", "Beach Food"],
  },
  {
    eyebrow: "COMMUNITY",
    title: "Help build the map",
    text: "Seen a great food van or local gem? Add it to BiteBeacon and help others discover it.",
    icon: "🧭",
    pills: ["Spot vans", "Add locations", "Grow the map"],
  },
  {
    eyebrow: "REWARDS",
    title: "Earn as you discover",
    text: "Earn Scout Points when vendors claim places you spotted and help grow the BiteBeacon network.",
    icon: "🏆",
    pills: ["Scout Points", "Vendor claims", "Rewards"],
  },
];

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);

  async function finish() {
    await AsyncStorage.setItem("seenOnboarding", "true");
    router.replace("/(tabs)/explore");
  }

  function next() {
    if (index < slides.length - 1) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      scrollRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
      return;
    }

    finish();
  }

  function skip() {
    finish();
  }

  function handleMomentumEnd(
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / width
    );
    setIndex(nextIndex);
  }

  return (
    <View style={styles.container}>
      {/* BRAND HEADER */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.brandTitle}>BiteBeacon</Text>
          <Text style={styles.brandSubtitle}>
            Discover Cornwall’s best local food
          </Text>
        </View>

        <Pressable onPress={skip} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* SLIDES */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {slides.map((slide) => (
          <View key={slide.title} style={styles.slide}>
            <View style={styles.card}>
              <View style={styles.iconOuter}>
                <View style={styles.iconInner}>
                  <Text style={styles.icon}>{slide.icon}</Text>
                </View>
              </View>

              <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.text}>{slide.text}</Text>

              <View style={styles.pillWrap}>
                {slide.pills.map((pill) => (
                  <View key={pill} style={styles.pill}>
                    <Text style={styles.pillText}>{pill}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.activeDot]}
            />
          ))}
        </View>

        <Pressable style={styles.button} onPress={next}>
          <Text style={styles.buttonText}>
            {index === slides.length - 1 ? "Get Started" : "Next"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const NAVY = "#0B2A5B";
const NAVY_DEEP = "#081F47";
const ORANGE = "#FF7A00";
const ORANGE_SOFT = "#FFB067";
const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
    paddingTop: 60,
    paddingBottom: 32,
  },

  topRow: {
    paddingHorizontal: 24,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  brandTitle: {
    color: WHITE,
    fontSize: 28,
    fontWeight: "800",
  },

  brandSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    marginTop: 4,
    fontWeight: "600",
  },

  skipText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "800",
  },

  slide: {
    width,
    paddingHorizontal: 24,
    justifyContent: "center",
  },

  card: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 28,
    padding: 26,
    borderWidth: 2,
    borderColor: "rgba(255,122,0,0.7)",
    minHeight: 500,
    justifyContent: "center",
  },

  iconOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,122,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
  },

  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: ORANGE_SOFT,
  },

  icon: {
    fontSize: 34,
  },

  eyebrow: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textAlign: "center",
    marginBottom: 8,
  },

  title: {
    color: WHITE,
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },

  text: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 22,
  },

  pillWrap: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  pill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  pillText: {
    color: WHITE,
    fontWeight: "700",
    fontSize: 12,
  },

  footer: {
    paddingHorizontal: 24,
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  activeDot: {
    width: 28,
    backgroundColor: ORANGE,
  },

  button: {
    backgroundColor: ORANGE,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: ORANGE_SOFT,
  },

  buttonText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "800",
  },
});