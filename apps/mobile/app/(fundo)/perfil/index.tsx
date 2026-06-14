import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Platform, Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { usuariosApi, authApi, type UsuarioPerfil } from "../../../lib/api";

const C = {
  blue:   "#1B4FD8",
  navy:   "#0C1A3D",
  ink:    "#0F172A",
  gray:   "#64748B",
  grayL:  "#94A3B8",
  surface:"#F8FAFC",
  border: "#E2E8F0",
  white:  "#FFFFFF",
  red:    "#EF4444",
};

export default function FundoPerfil() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);

  useEffect(() => {
    usuariosApi.obterPerfil().then(setPerfil).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja encerrar sua sessão?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair", style: "destructive",
        onPress: async () => {
          try {
            const rt = await SecureStore.getItemAsync("refreshToken");
            if (rt) await authApi.logout(rt);
          } catch {}
          await SecureStore.deleteItemAsync("accessToken");
          await SecureStore.deleteItemAsync("refreshToken");
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{perfil?.nome?.slice(0, 2).toUpperCase() ?? "GF"}</Text>
        </View>
        <Text style={s.nome}>{perfil?.nome ?? "Gestor de Fundo"}</Text>
        <Text style={s.email}>{perfil?.email ?? ""}</Text>
        <View style={s.roleBadge}>
          <Text style={s.roleText}>Gestor de Fundo</Text>
        </View>
      </View>

      <View style={s.body}>
        <View style={s.card}>
          <InfoRow label="Telefone" value={perfil?.telefone ?? "—"} />
          <InfoRow label="CPF"      value={perfil?.cpf      ?? "—"} />
          <InfoRow label="Membro desde" value={perfil?.criadoEm
            ? new Date(perfil.criadoEm).toLocaleDateString("pt-BR") : "—"} />
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Encerrar sessão</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <Text style={{ fontSize: 11, color: C.grayL, marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 14, color: C.ink, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  header: {
    paddingTop:        Platform.OS === "ios" ? 70 : 50,
    paddingBottom:     32,
    paddingHorizontal: 24,
    backgroundColor:   C.navy,
    alignItems:        "center",
    gap:               8,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#1E3A8A", justifyContent: "center", alignItems: "center",
    marginBottom: 4,
  },
  avatarText: { fontSize: 24, fontWeight: "800", color: C.white },
  nome:       { fontSize: 20, fontWeight: "800", color: C.white },
  email:      { fontSize: 13, color: C.grayL },
  roleBadge:  { backgroundColor: "#1E3A8A", paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  roleText:   { fontSize: 12, color: "#93C5FD", fontWeight: "600" },

  body: { flex: 1, padding: 20, gap: 20 },
  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6,
  },
  logoutBtn: {
    backgroundColor: "#FEE2E2", borderRadius: 14, padding: 16, alignItems: "center",
  },
  logoutText: { color: C.red, fontSize: 15, fontWeight: "700" },
});
