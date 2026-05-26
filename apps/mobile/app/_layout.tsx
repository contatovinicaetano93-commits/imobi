import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await SecureStore.getItemAsync("accessToken");
      setIsSignedIn(!!token);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isSignedIn === null) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)/obras");
    }
  }, [isSignedIn, segments]);

  if (isSignedIn === null) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ animation: "none" }} />
      <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
    </Stack>
  );
}
