import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import { setOnUnauthorized } from "../lib/api";

type RootLayoutProps = {
  children?: React.ReactNode;
};

function rotaPorPapel(tipo: string | null): string {
  if (tipo === "ADMIN") return "/(admin)/kyc";
  if (tipo === "GESTOR_OBRA") return "/(engenheiro)/obras";
  return "/(construtor)/obras";
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setOnUnauthorized(() => {
      setIsSignedIn(false);
    });
  }, []);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        const role = await SecureStore.getItemAsync("userRole");
        setIsSignedIn(!!token);
        setUserRole(role);
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

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isSignedIn && inAuthGroup) {
      router.replace(rotaPorPapel(userRole));
    }
  }, [isSignedIn, isLoading, segments, userRole]);

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
        name="(auth)"
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="(construtor)"
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="(admin)"
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="(engenheiro)"
        options={{
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
