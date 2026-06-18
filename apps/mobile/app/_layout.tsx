import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import { setOnUnauthorized, usuariosApi } from "../lib/api";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}

function RootLayoutInner() {
  const router = useRouter();
  const segments = useSegments();
  const { setUserTipo } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    setOnUnauthorized(() => {
      setIsSignedIn(false);
      setUserTipo(null);
    });
  }, []);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        if (token) {
          setIsSignedIn(true);
          try {
            const profile = await usuariosApi.obterPerfil();
            setUserTipo(profile.tipo as any);
          } catch {
            // Profile fetch failed — sign in still proceeds with null tipo
          }
        }
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
      router.replace("/(tabs)/obras");
    } else if (!isSignedIn && inTabsGroup) {
      router.replace("/");
    }
  }, [isSignedIn, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
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
