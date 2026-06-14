import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { creditoApi, type CreditoExtrato } from "../../../../lib/api";
import { formatarBRL } from "@imbobi/core";

const STATUS_CONFIG: Record<string, { label: string; cor: string; icon: keyof typeof Ionicons.glyphMap }> = {
  LIBERADO:     { label: "Liberado",  cor: "#16a34a", icon: "checkmark-circle" },
  LIBERADA:     { label: "Liberado",  cor: "#16a34a", icon: "checkmark-circle" },
  PENDENTE:     { label: "Pendente",  cor: "#d97706", icon: "time-outline" },
  EM_PROCESSO:  { label: "Processando", cor: "#2563eb", icon: "sync-outline" },
  FALHOU:       { label: "Falhou",    cor: "#dc2626", icon: "close-circle" },
  FALHA:        { label: "Falhou",    cor: "#dc2626", icon: "close-circle" },
};

export default function CronogramaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [extrato, setExtrato] = useState<CreditoExtrato | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    creditoApi.extrato(id)
      .then(setExtrato)
      .catch((e: any) => setError(e.message ?? "Erro ao carregar extrato"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  if (error || !extrato) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Crédito não encontrado."}</Text>
      </View>
    );
  }

  const pct = extrato.valorAprovado > 0
    ? (Number(extrato.valorLiberado) / Number(extrato.valorAprovado)) * 100
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Cronograma</Text>
      </View>

      {/* Resumo do crédito */}
      <View style={styles.resumo}>
        <View style={styles.resumoRow}>
          <Text style={styles.resumoLabel}>Valor aprovado</Text>
          <Text style={styles.resumoValor}>{formatarBRL(Number(extrato.valorAprovado))}</Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%` as any }]} />
          </View>
          <Text style={styles.pct}>{Math.round(pct)}%</Text>
        </View>
        <View style={styles.resumoRow}>
          <Text style={styles.resumoLabel}>Liberado</Text>
          <Text style={[styles.resumoValor, { color: "#2563eb" }]}>{formatarBRL(Number(extrato.valorLiberado))}</Text>
        </View>
        <View style={styles.resumoRow}>
          <Text style={styles.resumoLabel}>Prazo</Text>
          <Text style={styles.resumoValor}>{extrato.prazoMeses} meses · {Number(extrato.taxaMensal).toFixed(2)}% a.m.</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Liberações ({extrato.liberacoes.length})</Text>

      <FlatList
        data={extrato.liberacoes}
        keyExtractor={(l) => l.liberacaoId}
        contentContainerStyle={{ gap: 10, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhuma liberação registrada ainda.</Text>
          </View>
        }
        renderItem={({ item: lib, index }) => {
          const cfg = STATUS_CONFIG[lib.status] ?? { label: lib.status, cor: "#6b7280", icon: "ellipse-outline" as const };
          return (
            <View style={styles.item}>
              <View style={styles.timeline}>
                <View style={[styles.dot, { backgroundColor: cfg.cor }]}>
                  <Ionicons name={cfg.icon} size={14} color="#fff" />
                </View>
                {index < extrato.liberacoes.length - 1 && <View style={styles.line} />}
              </View>
              <View style={styles.itemBody}>
                <View style={styles.itemRow}>
                  <Text style={styles.itemValor}>{formatarBRL(Number(lib.valor))}</Text>
                  <View style={[styles.itemTag, { backgroundColor: cfg.cor + "18" }]}>
                    <Text style={[styles.itemTagText, { color: cfg.cor }]}>{cfg.label}</Text>
                  </View>
                </View>
                <Text style={styles.itemData}>{new Date(lib.criadoEm).toLocaleDateString("pt-BR")}</Text>
                {lib.motivo && <Text style={styles.itemMotivo}>{lib.motivo}</Text>}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", paddingTop: 56 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  resumo: { backgroundColor: "#fff", marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 10, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  resumoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resumoLabel: { fontSize: 13, color: "#6b7280" },
  resumoValor: { fontSize: 14, fontWeight: "700", color: "#111827" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bar: { flex: 1, height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#2563eb", borderRadius: 3 },
  pct: { fontSize: 12, color: "#2563eb", fontWeight: "700", width: 36, textAlign: "right" },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 16, marginBottom: 4 },
  empty: { alignItems: "center", paddingVertical: 32 },
  emptyText: { color: "#9ca3af", fontSize: 14 },
  item: { flexDirection: "row", paddingHorizontal: 16 },
  timeline: { alignItems: "center", marginRight: 12 },
  dot: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  line: { width: 2, flex: 1, backgroundColor: "#e5e7eb", marginVertical: 4 },
  itemBody: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, gap: 4, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemValor: { fontSize: 15, fontWeight: "700", color: "#111827" },
  itemTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  itemTagText: { fontSize: 11, fontWeight: "600" },
  itemData: { fontSize: 12, color: "#9ca3af" },
  itemMotivo: { fontSize: 12, color: "#dc2626", fontStyle: "italic" },
});
