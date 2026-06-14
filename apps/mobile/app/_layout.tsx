import { useEffect, useState, useCallback } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import { setOnUnauthorized, usuariosApi } from "../lib/api";

// Called by login/cadastro after tokens are saved — triggers re-auth in root layout
let _reloadAuth: (() => Promise<void>) | null = null;
export function reloadAuth(): Promise<void> {
  return _reloadAuth?.() ?? Promise.resolve();
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userTipo, setUserTipo] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (token) {
        const perfil = await usuariosApi.obterPerfil();
        setUserTipo(perfil.tipo);
        setIsSignedIn(true);
      } else {
        setIsSignedIn(false);
        setUserTipo(null);
      }
    } catch {
      // 401 handled by setOnUnauthorized; other errors = treat as signed out
      setIsSignedIn(false);
      setUserTipo(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register bootstrap as the module-level reload trigger
  useEffect(() => {
    _reloadAuth = bootstrap;
    return () => { _reloadAuth = null; };
  }, [bootstrap]);

  // Register 401 handler
  useEffect(() => {
    setOnUnauthorized(() => {
      setIsSignedIn(false);
      setUserTipo(null);
      setIsLoading(false);
    });
  }, []);

  // Initial auth check on mount
  useEffect(() => { bootstrap(); }, []);

  // Route guard: runs whenever auth state or navigation changes
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (isSignedIn && inAuthGroup) {
      const tipo = userTipo ?? "TOMADOR";
      if (tipo === "ENGENHEIRO") {
        router.replace("/(engenheiro)/vistorias");
      } else if (tipo === "ADMIN" || tipo === "GESTOR") {
        router.replace("/(admin)/dashboard");
      } else if (tipo === "PARCEIRO" || tipo === "COMERCIAL") {
        router.replace("/(comercial)/dashboard");
      } else if (tipo === "GESTOR_FUNDO") {
        router.replace("/(fundo)/carteira");
      } else {
        router.replace("/(construtor)/obras");
      }
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
      <Stack.Screen name="(construtor)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(engenheiro)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(admin)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(comercial)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(fundo)" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
