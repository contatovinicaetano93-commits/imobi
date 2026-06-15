import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { adminApi, type RiscoData } from "../../../lib/api";
import { formatarBRL } from "../../../lib/api";

const STATUS_COR: Record<string, string> = {
  ATIVO: "#2563eb",
  VENCIDO: "#dc2626",
  SUSPENSO: "#d97706",
  QUITADO: "#16a34a",
};

const AGING_COR = ["#16a34a", "#d97706", "#ea580c", "#dc2626"];

function MetricCard({ label, value, sub, destaque }: { label: string; value: string; sub?: string; destaque?: boolean }) {
  return (
    <View style={[s.metricCard, destaque && s.metricCardDestaque]}>
      <Text style={[s.metricLabel, destaque && s.metricLabelDestaque]}>{label}</Text>
      <Text style={[s.metricValue, destaque && s.metricValueDestaque]}>{value}</Text>
      {sub && <Text style={[s.metricSub, destaque && s.metricSubDestaque]}>{sub}</Text>}
    </View>
  );
}

export default function RiscoScreen() {
  const [data, setData] = useState<RiscoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await adminApi.risco();
      setData(res);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar analytics de risco");
    }
  }, []);

  useEffect(() => { carregar().finally(() => setLoading(false)); }, [carregar]);

  const onRefresh = async () => { setRefreshing(true); await carregar(); setRefreshing(false); };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#7c3aed" /></View>;

  if (error || !data) {
    return <View style={s.center}><Text style={s.error}>{error ?? "Sem dados"}</Text></View>;
  }

  const { carteira, npl, liberacoes } = data;
  const utilizacao = carteira.valorTotal > 0
    ? Math.round((carteira.valorLiberado / carteira.valorTotal) * 100)
    : 0;

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
    >
      <Text style={s.title}>Analytics de Risco</Text>

      {/* Carteira */}
      <Text style={s.sectionLabel}>Carteira</Text>
      <View style={s.metricsRow}>
        <MetricCard label="Créditos" value={String(carteira.totalCreditos)} />
        <MetricCard label="Volume total" value={formatarBRL(carteira.valorTotal)} />
        <MetricCard label="Utilização" value={`${utilizacao}%`} sub={formatarBRL(carteira.valorLiberado)} />
      </View>

      <Text style={s.sectionLabel}>Por status</Text>
      {carteira.porStatus.map((item) => {
        const cor = STATUS_COR[item.status] ?? "#6b7280";
        const pct = carteira.valorTotal > 0 ? (item.valor / carteira.valorTotal) * 100 : 0;
        return (
          <View key={item.status} style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: cor }]} />
            <Text style={s.statusLabel}>{item.status}</Text>
            <View style={s.statusBarWrap}>
              <View style={s.statusBar}>
                <View style={[s.statusBarFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: cor }]} />
              </View>
            </View>
            <Text style={s.statusPct}>{Math.round(pct)}%</Text>
            <Text style={s.statusCount}>{item.count}</Text>
          </View>
        );
      })}

      {/* NPL */}
      <Text style={s.sectionLabel}>NPL — Inadimplência</Text>
      <View style={s.metricsRow}>
        <MetricCard
          label="NPL ratio"
          value={`${npl.percentualCarteira.toFixed(1)}%`}
          destaque={npl.percentualCarteira > 5}
        />
        <MetricCard label="Contratos" value={String(npl.count)} sub="vencidos" />
        <MetricCard label="Exposição" value={formatarBRL(npl.valor)} />
      </View>

      <Text style={s.sectionLabel}>NPL por aging</Text>
      <View style={s.agingCard}>
        {npl.porAging.map((item, i) => {
          const cor = AGING_COR[i] ?? "#6b7280";
          const maxValor = Math.max(...npl.porAging.map((a) => a.valor), 1);
          const pct = (item.valor / maxValor) * 100;
          return (
            <View key={item.faixa} style={s.agingRow}>
              <Text style={s.agingFaixa}>{item.faixa}</Text>
              <View style={s.agingBarWrap}>
                <View style={s.agingBar}>
                  <View style={[s.agingBarFill, { width: `${Math.max(pct, item.count > 0 ? 4 : 0)}%` as any, backgroundColor: cor }]} />
                </View>
              </View>
              <Text style={[s.agingValor, { color: cor }]}>
                {item.count > 0 ? formatarBRL(item.valor) : "—"}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Liberações */}
      <Text style={s.sectionLabel}>Liberações</Text>
      <View style={s.metricsRow}>
        <MetricCard
          label="Taxa de falha"
          value={`${liberacoes.taxaFalha}%`}
          destaque={liberacoes.taxaFalha > 10}
        />
        <MetricCard label="Falhas" value={String(liberacoes.totalFalha)} />
        <MetricCard label="Valor em falha" value={formatarBRL(liberacoes.valorFalha)} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, gap: 14, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  metricsRow: { flexDirection: "row", gap: 8 },
  metricCard: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, gap: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  metricCardDestaque: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  metricLabel: { fontSize: 10, color: "#9ca3af", textAlign: "center" },
  metricLabelDestaque: { color: "#dc2626" },
  metricValue: { fontSize: 16, fontWeight: "800", color: "#111827", textAlign: "center" },
  metricValueDestaque: { color: "#dc2626" },
  metricSub: { fontSize: 10, color: "#9ca3af", textAlign: "center" },
  metricSubDestaque: { color: "#dc2626" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, padding: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: "600", color: "#374151", width: 72 },
  statusBarWrap: { flex: 1 },
  statusBar: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden" },
  statusBarFill: { height: "100%", borderRadius: 3 },
  statusPct: { fontSize: 11, color: "#6b7280", width: 28, textAlign: "right" },
  statusCount: { fontSize: 11, fontWeight: "600", color: "#374151", width: 24, textAlign: "right" },
  agingCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  agingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  agingFaixa: { fontSize: 12, fontWeight: "600", color: "#374151", width: 52 },
  agingBarWrap: { flex: 1 },
  agingBar: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, overflow: "hidden" },
  agingBarFill: { height: "100%", borderRadius: 4 },
  agingValor: { fontSize: 12, fontWeight: "600", width: 90, textAlign: "right" },
});
