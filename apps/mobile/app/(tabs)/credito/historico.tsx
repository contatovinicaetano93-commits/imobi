import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { creditoHistoricoApi, scoreApi, type CreditoDetalhe } from "../../../lib/api";

const STATUS_COLOR: Record<string, string> = {
  ATIVO: "#16a34a",
  QUITADO: "#6b7280",
  VENCIDO: "#dc2626",
  PENDENTE: "#d97706",
};

export default function CreditoHistoricoScreen() {
  const router = useRouter();
  const [creditos, setCreditos] = useState<CreditoDetalhe[]>([]);
  const [score, setScore] = useState<{ total: number; nivel: string; taxaMensalIndicativa: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      creditoHistoricoApi.meusCreditosDetalhado(),
      scoreApi.obter(),
    ]).then(([c, s]) => {
      setCreditos(c);
      setScore(s as any);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Meus Créditos</Text>

      {score && (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Score de Construtibilidade</Text>
          <Text style={styles.scoreValue}>{score.total}</Text>
          <Text style={styles.scoreNivel}>{score.nivel} · {score.taxaMensalIndicativa}</Text>
        </View>
      )}

      {creditos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyText}>Nenhum crédito ativo</Text>
          <Text style={styles.emptySubText}>Use o simulador para calcular seu crédito</Text>
        </View>
      ) : (
        creditos.map((c) => <CreditoCard key={c.creditoId} credito={c} />)
      )}
    </ScrollView>
  );
}

function CreditoCard({ credito }: { credito: CreditoDetalhe }) {
  const [expanded, setExpanded] = useState(false);
  const pctLiberado = credito.valorAprovado > 0
    ? (credito.valorLiberado / credito.valorAprovado) * 100
    : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={() => setExpanded(!expanded)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardValor}>{fmt(credito.valorAprovado)}</Text>
          <Text style={styles.cardMeta}>
            {credito.prazoMeses} meses · {(credito.taxaMensal * 100).toFixed(2)}% a.m.
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[credito.status] + "20" }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[credito.status] }]}>
            {credito.status}
          </Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Liberado: {fmt(credito.valorLiberado)} ({pctLiberado.toFixed(0)}%)</Text>
      </View>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${Math.min(100, pctLiberado)}%` as any }]} />
      </View>

      {credito.feeEstruturacao != null && (
        <Text style={styles.fee}>
          Fee estruturação: {fmt(credito.feeEstruturacao)} (3%)
        </Text>
      )}

      {expanded && credito.liberacoes && credito.liberacoes.length > 0 && (
        <View style={styles.liberacoes}>
          <Text style={styles.liberacoesTitle}>Parcelas liberadas</Text>
          {credito.liberacoes.map((lib, i) => (
            <View key={lib.liberacaoId} style={styles.libRow}>
              <Text style={styles.libNum}>#{i + 1}</Text>
              <View style={styles.libInfo}>
                <Text style={styles.libValor}>{fmt(lib.valorLiquido ?? lib.valor)} líquido</Text>
                {lib.feeTranche != null && (
                  <Text style={styles.libFee}>Fee: {fmt(lib.feeTranche)} (7%)</Text>
                )}
                <Text style={styles.libData}>
                  {new Date(lib.criadoEm).toLocaleDateString("pt-BR")}
                </Text>
              </View>
              <View style={[styles.libStatus, { backgroundColor: STATUS_COLOR[lib.status] + "20" }]}>
                <Text style={[styles.libStatusText, { color: STATUS_COLOR[lib.status] }]}>
                  {lib.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {credito.liberacoes && credito.liberacoes.length > 0 && (
        <Text style={styles.expandHint}>{expanded ? "▲ Ocultar parcelas" : `▼ Ver ${credito.liberacoes.length} parcelas`}</Text>
      )}
    </TouchableOpacity>
  );
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, paddingBottom: 40, gap: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { marginBottom: 4 },
  backText: { color: "#16a34a", fontSize: 15, fontWeight: "600" },
  titulo: { fontSize: 22, fontWeight: "700", color: "#111827" },
  scoreCard: { backgroundColor: "#16a34a", borderRadius: 16, padding: 20, alignItems: "center", gap: 4 },
  scoreLabel: { fontSize: 13, color: "#dcfce7", fontWeight: "600" },
  scoreValue: { fontSize: 48, fontWeight: "800", color: "#fff", lineHeight: 56 },
  scoreNivel: { fontSize: 14, color: "#dcfce7" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptySubText: { fontSize: 14, color: "#9ca3af" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, gap: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardValor: { fontSize: 20, fontWeight: "800", color: "#111827" },
  cardMeta: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "700" },
  progressRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 12, color: "#6b7280" },
  progressBg: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#16a34a", borderRadius: 3 },
  fee: { fontSize: 12, color: "#9ca3af" },
  liberacoes: { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 10, gap: 8 },
  liberacoesTitle: { fontSize: 13, fontWeight: "700", color: "#374151" },
  libRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  libNum: { fontSize: 13, fontWeight: "700", color: "#9ca3af", width: 24 },
  libInfo: { flex: 1 },
  libValor: { fontSize: 14, fontWeight: "700", color: "#111827" },
  libFee: { fontSize: 12, color: "#9ca3af" },
  libData: { fontSize: 12, color: "#9ca3af" },
  libStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  libStatusText: { fontSize: 11, fontWeight: "700" },
  expandHint: { fontSize: 12, color: "#16a34a", textAlign: "center", fontWeight: "600" },
});
