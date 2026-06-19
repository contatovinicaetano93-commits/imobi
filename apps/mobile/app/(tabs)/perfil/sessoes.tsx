import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { sessoesApi, type SessaoAtiva } from "../../../lib/api";

export default function SessoesScreen() {
  const router = useRouter();
  const [sessoes, setSessoes] = useState<SessaoAtiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [revogando, setRevogando] = useState<string | null>(null);

  useEffect(() => {
    carregarSessoes();
  }, []);

  async function carregarSessoes() {
    try {
      const data = await sessoesApi.listar();
      setSessoes(Array.isArray(data) ? data : []);
    } catch {
      setSessoes([]);
    } finally {
      setLoading(false);
    }
  }

  function confirmarRevogacao(sessionId: string) {
    Alert.alert(
      "Encerrar sessão",
      "Tem certeza que deseja encerrar esta sessão?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Encerrar",
          style: "destructive",
          onPress: () => revogarSessao(sessionId),
        },
      ]
    );
  }

  async function revogarSessao(sessionId: string) {
    setRevogando(sessionId);
    try {
      await sessoesApi.revogar(sessionId);
      setSessoes((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } catch {
      Alert.alert("Erro", "Não foi possível encerrar a sessão.");
    } finally {
      setRevogando(null);
    }
  }

  function confirmarRevogarTodas() {
    Alert.alert(
      "Encerrar todas as sessões",
      "Isso encerrará todas as suas sessões ativas. Você precisará fazer login novamente em todos os dispositivos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Encerrar todas",
          style: "destructive",
          onPress: revogarTodas,
        },
      ]
    );
  }

  async function revogarTodas() {
    setLoading(true);
    try {
      await sessoesApi.revogarTodas();
      setSessoes([]);
    } catch {
      Alert.alert("Erro", "Não foi possível encerrar as sessões.");
    } finally {
      setLoading(false);
    }
  }

  function formatarData(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatarUserAgent(ua: string | null) {
    if (!ua) return "Dispositivo desconhecido";
    if (ua.toLowerCase().includes("iphone") || ua.toLowerCase().includes("ios")) return "iPhone / iOS";
    if (ua.toLowerCase().includes("android")) return "Android";
    if (ua.toLowerCase().includes("mobile")) return "Dispositivo móvel";
    if (ua.toLowerCase().includes("mac")) return "Mac";
    if (ua.toLowerCase().includes("windows")) return "Windows";
    return ua.substring(0, 40);
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Sessões Ativas</Text>
      </View>

      <Text style={styles.subtitle}>
        Dispositivos e aplicativos com acesso à sua conta.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1B4FD8" />
        </View>
      ) : sessoes.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="phone-portrait-outline" size={40} color="#d1d5db" />
          <Text style={styles.emptyText}>Nenhuma sessão ativa encontrada.</Text>
        </View>
      ) : (
        <>
          {sessoes.map((sessao) => (
            <View key={sessao.sessionId} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.iconBox}>
                  <Ionicons name="phone-portrait" size={20} color="#1B4FD8" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.deviceName} numberOfLines={1}>
                    {formatarUserAgent(sessao.userAgent)}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {sessao.ip ?? "IP desconhecido"} · Criada {formatarData(sessao.criadoEm)}
                  </Text>
                  <Text style={styles.cardExpires}>
                    Expira em {formatarData(sessao.expiresAt)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => confirmarRevogacao(sessao.sessionId)}
                disabled={revogando === sessao.sessionId}
                style={styles.revogarBtn}
              >
                {revogando === sessao.sessionId ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Ionicons name="close-circle" size={22} color="#ef4444" />
                )}
              </TouchableOpacity>
            </View>
          ))}

          {sessoes.length > 1 && (
            <TouchableOpacity style={styles.revogarTodasBtn} onPress={confirmarRevogarTodas}>
              <Text style={styles.revogarTodasText}>Encerrar todas as sessões</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 24 },
  center: { paddingVertical: 60, alignItems: "center" },
  emptyBox: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, color: "#9ca3af", textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1 },
  deviceName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  cardMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  cardExpires: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  revogarBtn: { padding: 8 },
  revogarTodasBtn: { marginTop: 8, backgroundColor: "#fef2f2", borderRadius: 12, padding: 14, alignItems: "center" },
  revogarTodasText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
});
