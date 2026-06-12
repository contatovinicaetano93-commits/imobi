import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { configureApiBaseUrl, setOnUnauthorized } from "../lib/api";

const apiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
if (apiUrl) configureApiBaseUrl(apiUrl);

function decodeRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json.tipo ?? null;
  } catch {
    return null;
  }
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    setOnUnauthorized(() => {
      setIsSignedIn(false);
    });
  }, []);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        if (token) {
          const role = decodeRole(token);
          if (role) await SecureStore.setItemAsync("userRole", role);
          setIsSignedIn(true);
        } else {
          setIsSignedIn(false);
        }
      } catch {
        setIsSignedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)/obras");
    }
  }, [isSignedIn, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
