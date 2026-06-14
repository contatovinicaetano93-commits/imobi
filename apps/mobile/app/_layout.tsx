import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import { setOnUnauthorized } from "../lib/api";

type UsuarioTipo =
  | "TOMADOR" | "CONSTRUTOR" | "GESTOR_OBRA"
  | "ENGENHEIRO"
  | "ADMIN" | "GESTOR"
  | "COMERCIAL" | "PARCEIRO"
  | "GESTOR_FUNDO";

function decodeJwtRole(token: string): UsuarioTipo | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

function grupoParaTipo(tipo: UsuarioTipo | null): string {
  if (!tipo) return "/(auth)/login";
  if (tipo === "ENGENHEIRO") return "/(engenheiro)/vistorias";
  if (tipo === "ADMIN" || tipo === "GESTOR") return "/(admin)/dashboard";
  if (tipo === "COMERCIAL" || tipo === "PARCEIRO") return "/(comercial)/dashboard";
  if (tipo === "GESTOR_FUNDO") return "/(fundo)/dashboard";
  return "/(construtor)/obras";
}

function grupoAtual(segments: string[]): string | null {
  const g = segments[0];
  if (!g) return null;
  return g;
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  const [destino, setDestino] = useState<string | null>(null);

  useEffect(() => {
    setOnUnauthorized(() => {
      setDestino(null);
      router.replace("/(auth)/login");
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        if (token) {
          const tipo = decodeJwtRole(token);
          setDestino(grupoParaTipo(tipo));
        } else {
          setDestino(null);
        }
      } catch {
        setDestino(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const atual = grupoAtual(segments);
    if (!destino) {
      if (atual !== "(auth)") router.replace("/(auth)/login");
    } else {
      if (atual === "(auth)" || atual === null) router.replace(destino as any);
    }
  }, [isLoading, destino, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#16a34a" />
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
