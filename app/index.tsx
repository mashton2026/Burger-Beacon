import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function IndexScreen() {
  useEffect(() => {
    async function checkOnboarding() {

      // 👇 TEMP: force reset onboarding
      await AsyncStorage.removeItem("seenOnboarding");

      const seenOnboarding = null;

      if (seenOnboarding === "true") {
        router.replace("/(tabs)/explore");
        return;
      }

      router.replace("/onboarding");
    }

    checkOnboarding();
  }, []);

  return <View style={{ flex: 1 }} />;
}