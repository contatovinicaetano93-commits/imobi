import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import { setOnUnauthorized } from "../lib/api";
import { getMobileRoleHome, normalizeUserRole, type AppRole } from "@imbobi/schemas";

type MobileHomeRoute = "/(tabs)/comercial" | "/(tabs)/engenheiro" | "/(tabs)/obras" | "/(tabs)/perfil";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    setOnUnauthorized(() => {
      setIsSignedIn(false);
      setRole(null);
      SecureStore.deleteItemAsync("userRole").catch(() => {});
    });
  }, []);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        const storedRole = normalizeUserRole(await SecureStore.getItemAsync("userRole"));
        setIsSignedIn(!!token);
        setRole(storedRole);
      } catch (e) {
        console.error("Failed to restore token", e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup  = segments[0] === "(auth)";
    const inTabsGroup  = segments[0] === "(tabs)";
    const onWelcome    = segments.length === 0;

    if (isSignedIn && (inAuthGroup || onWelcome)) {
      router.replace(getMobileRoleHome(role) as MobileHomeRoute);
    } else if (!isSignedIn && inTabsGroup) {
      router.replace("/");
    }
  }, [isSignedIn, isLoading, role, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          gestureEnabled: false,
          animation: "none",
        }}
      />
      <Stack.Screen
        name="(auth)"
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
