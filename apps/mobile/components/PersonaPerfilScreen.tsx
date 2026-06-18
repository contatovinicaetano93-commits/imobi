import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import ScreenHeader from "./ScreenHeader";
import { usuariosApi, authApi, type UsuarioPerfil } from "../lib/api";
import { roleLabel } from "../lib/roles";

type Props = { accent?: string; panelLabel?: string };

export default function PersonaPerfilScreen({ accent = "#1B4FD8", panelLabel = "Minha conta" }: Props) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usuariosApi.obterPerfil()
      .then(setUsuario)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sair = () => {
    Alert.alert("Sair", "Encerrar sessão?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => {
        try {
          const rt = await SecureStore.getItemAsync("refreshToken");
          if (rt) await authApi.logout(rt);
        } catch { /* */ }
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
        await SecureStore.deleteItemAsync("userTipo");
        router.replace("/login");
      }},
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={accent} /></View>;
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Perfil" subtitle={panelLabel} dark accent={accent} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{usuario?.nome?.charAt(0)?.toUpperCase() ?? "?"}</Text>
        </View>
        <Text style={styles.nome}>{usuario?.nome ?? "—"}</Text>
        <Text style={styles.tipo}>{roleLabel(usuario?.tipo ?? "")}</Text>
        <View style={styles.fields}>
          <Row label="E-MAIL" value={usuario?.email} />
          <Row label="WHATSAPP" value={usuario?.telefone} />
          <Row label="KYC" value={usuario?.kycStatus} />
        </View>
        <TouchableOpacity style={[styles.logout, { borderColor: accent }]} onPress={sair}>
          <Ionicons name="log-out-outline" size={20} color={accent} />
          <Text style={[styles.logoutText, { color: accent }]}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 24, alignItems: "center", paddingBottom: 48 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#E2E8F0", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#0F172A" },
  nome: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  tipo: { fontSize: 13, color: "#64748B", marginTop: 4, marginBottom: 24 },
  fields: { width: "100%", backgroundColor: "#FFF", borderRadius: 14, padding: 16, gap: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  row: { gap: 4 },
  rowLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.8 },
  rowValue: { fontSize: 15, color: "#0F172A" },
  logout: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 32, paddingVertical: 14, paddingHorizontal: 24, borderWidth: 1.5, borderRadius: 12 },
  logoutText: { fontWeight: "700", fontSize: 15 },
});
