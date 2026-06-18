import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { setOnUnauthorized, usuariosApi } from "../lib/api";
import { getHomeRoute, isInCorrectApp } from "../lib/roles";

const AUTH_SEGMENTS = new Set(["(auth)", "login", "cadastro", "esqueceu-senha"]);

function isAuthRoute(segments: string[]) {
  return segments.some((s) => AUTH_SEGMENTS.has(s));
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userTipo, setUserTipo] = useState<string>("TOMADOR");

  useEffect(() => {
    setOnUnauthorized(() => {
      setIsSignedIn(false);
      setUserTipo("TOMADOR");
      SecureStore.deleteItemAsync("userTipo").catch(() => {});
    });
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        if (!token) {
          setIsSignedIn(false);
          return;
        }
        setIsSignedIn(true);
        const cached = await SecureStore.getItemAsync("userTipo");
        if (cached) setUserTipo(cached);
        try {
          const perfil = await usuariosApi.obterPerfil();
          setUserTipo(perfil.tipo);
          await SecureStore.setItemAsync("userTipo", perfil.tipo);
        } catch {
          /* offline — usa cache */
        }
      } catch (e) {
        console.error("bootstrap", e);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const onAuth = isAuthRoute(segments);
    const home = getHomeRoute(userTipo);

    if (!isSignedIn && !onAuth) {
      router.replace("/login");
      return;
    }
    if (isSignedIn && onAuth) {
      router.replace(home as never);
      return;
    }
    if (isSignedIn && !onAuth && !isInCorrectApp(segments, userTipo)) {
      router.replace(home as never);
    }
  }, [isSignedIn, isLoading, segments, userTipo]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0C1A3D" }}>
        <ActivityIndicator size="large" color="#4ADE80" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(admin)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(engenheiro)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(gestor)" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

export async function persistSession(tipo: string) {
  await SecureStore.setItemAsync("userTipo", tipo);
}
