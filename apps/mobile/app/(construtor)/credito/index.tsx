import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { creditoApi, type Credito } from "../../../lib/api";
import { formatarBRL } from "../../../lib/api";

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANALISE: "Em análise",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  ATIVO: "Ativo",
  QUITADO: "Quitado",
  INADIMPLENTE: "Inadimplente",
};

const STATUS_COR: Record<string, string> = {
  APROVADO: "#16a34a",
  ATIVO: "#2563eb",
  QUITADO: "#6b7280",
  PENDENTE: "#d97706",
  EM_ANALISE: "#d97706",
  REPROVADO: "#dc2626",
  INADIMPLENTE: "#dc2626",
};

export default function CreditoScreen() {
  const router = useRouter();
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const data = await creditoApi.meus();
      setCreditos(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar créditos");
    }
  }, []);

  useEffect(() => {
    carregar().finally(() => setLoading(false));
  }, [carregar]);

  const onRefresh = async () => {
    setRefreshing(true);
    await carregar();
    setRefreshing(false);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
    >
      <Text style={styles.title}>Crédito</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {creditos.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="wallet-outline" size={52} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Nenhum crédito ativo</Text>
          <Text style={styles.emptyText}>Simule e solicite crédito para sua obra.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Meus créditos</Text>
          {creditos.map((c) => {
            const pct = c.valorAprovado > 0 ? (c.valorLiberado / c.valorAprovado) * 100 : 0;
            const cor = STATUS_COR[c.status] ?? "#6b7280";
            return (
              <TouchableOpacity
                key={c.id}
                style={styles.card}
                activeOpacity={0.75}
                onPress={() => router.push(`/(construtor)/credito/${c.id}`)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.statusTag, { backgroundColor: cor + "18" }]}>
                    <Text style={[styles.statusText, { color: cor }]}>{STATUS_LABEL[c.status] ?? c.status}</Text>
                  </View>
                  <Text style={styles.prazo}>{c.prazoMeses} meses</Text>
                </View>

                <Text style={styles.valor}>{formatarBRL(c.valorAprovado)}</Text>
                <Text style={styles.subValor}>aprovado</Text>

                <View style={styles.progressRow}>
                  <View style={styles.bar}>
                    <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%` as any }]} />
                  </View>
                  <Text style={styles.pct}>{Math.round(pct)}%</Text>
                </View>
                <Text style={styles.liberado}>{formatarBRL(c.valorLiberado)} liberado</Text>

                {c.obras.length > 0 && (
                  <Text style={styles.obra} numberOfLines={1}>
                    <Ionicons name="home-outline" size={12} color="#9ca3af" /> {c.obras[0].nome}
                  </Text>
                )}

                <View style={styles.verCronograma}>
                  <Text style={styles.verCronogramaText}>Ver cronograma</Text>
                  <Ionicons name="chevron-forward" size={14} color="#2563eb" />
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      <TouchableOpacity style={styles.simBtn} onPress={() => router.push("/(construtor)/credito/simulador")}>
        <Ionicons name="calculator-outline" size={18} color="#16a34a" />
        <Text style={styles.simBtnText}>Simular novo crédito</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, gap: 12, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  error: { color: "#dc2626", fontSize: 14 },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  emptyText: { fontSize: 14, color: "#9ca3af", textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 6, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusTag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  prazo: { fontSize: 12, color: "#9ca3af" },
  valor: { fontSize: 28, fontWeight: "800", color: "#111827", marginTop: 4 },
  subValor: { fontSize: 12, color: "#9ca3af", marginTop: -4 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  bar: { flex: 1, height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#2563eb", borderRadius: 3 },
  pct: { fontSize: 12, color: "#2563eb", fontWeight: "700", width: 36, textAlign: "right" },
  liberado: { fontSize: 13, color: "#6b7280" },
  obra: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  verCronograma: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  verCronogramaText: { fontSize: 13, color: "#2563eb", fontWeight: "600" },
  simBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: "#16a34a", borderRadius: 14, padding: 14, marginTop: 8 },
  simBtnText: { fontSize: 15, fontWeight: "600", color: "#16a34a" },
});
