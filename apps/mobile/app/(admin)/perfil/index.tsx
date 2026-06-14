import { View, Text, TouchableOpacity, Alert, StatusBar, Platform } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { usuariosApi, authApi, type UsuarioPerfil } from "../../../lib/api";

const C = { blue: "#1B4FD8", navy: "#0C1A3D", mint: "#22C55E", ink: "#0F172A", gray: "#64748B", surface: "#F8FAFC", border: "#E2E8F0", white: "#FFFFFF", red: "#EF4444" };

export default function PerfilAdminScreen() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);

  useEffect(() => {
    usuariosApi.obterPerfil().then(setPerfil).catch(() => {});
  }, []);

  const logout = () => {
    Alert.alert("Sair", "Deseja encerrar sua sessão?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          const refresh = await SecureStore.getItemAsync("refreshToken");
          if (refresh) await authApi.logout(refresh).catch(() => {});
          await SecureStore.deleteItemAsync("accessToken");
          await SecureStore.deleteItemAsync("refreshToken");
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: Platform.OS === "ios" ? 60 : 40, paddingHorizontal: 20, paddingBottom: 32, backgroundColor: C.navy, alignItems: "center" }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.blue, justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 28, color: C.white, fontWeight: "800" }}>{perfil?.nome?.[0] ?? "A"}</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: C.white }}>{perfil?.nome ?? "Admin"}</Text>
        <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>{perfil?.email ?? ""}</Text>
      </View>
      <View style={{ flex: 1, backgroundColor: C.surface, padding: 20, gap: 12 }}>
        <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 16, gap: 8 }}>
          <Row label="CPF" value={perfil?.cpf ?? "—"} />
          <Row label="Telefone" value={perfil?.telefone ?? "—"} />
          <Row label="Tipo" value={perfil?.tipo ?? "Admin"} />
        </View>
        <TouchableOpacity onPress={logout} style={{ backgroundColor: "#FEE2E2", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 }}>
          <Text style={{ color: C.red, fontSize: 16, fontWeight: "700" }}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
      <Text style={{ fontSize: 13, color: "#64748B" }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: "#0F172A" }}>{value}</Text>
    </View>
  );
}
