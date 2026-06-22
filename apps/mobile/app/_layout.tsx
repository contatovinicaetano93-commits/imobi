import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { getHomeRoute, isInCorrectApp } from "../lib/roles";

const AUTH_SEGMENTS = new Set(["(auth)", "login", "cadastro", "esqueceu-senha", "index"]);

function isPublicRoute(segments: string[]) {
  if (segments.length === 0) return true;
  return segments.some((s) => AUTH_SEGMENTS.has(s));
}

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { isLoading, isSignedIn, userTipo } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const onPublic = isPublicRoute(segments);
    const home = getHomeRoute(userTipo);

    if (!isSignedIn && !onPublic) {
      router.replace("/login");
      return;
    }
    if (isSignedIn && onPublic) {
      router.replace(home as never);
      return;
    }
    if (isSignedIn && !onPublic && !isInCorrectApp(segments, userTipo)) {
      router.replace(home as never);
    }
  }, [isSignedIn, isLoading, segments, userTipo, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0C1A3D" }}>
        <ActivityIndicator size="large" color="#4ADE80" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(admin)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(engenheiro)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(gestor)" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
