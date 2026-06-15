import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { engenheiroApi, type ObraEngenheiro } from "../../../lib/api";
import { formatarBRL } from "../../../lib/api";

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={s.metricCard}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>{value}</Text>
      {sub && <Text style={s.metricSub}>{sub}</Text>}
    </View>
  );
}

export default function DesempenhoScreen() {
  const [obras, setObras] = useState<ObraEngenheiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const data = await engenheiroApi.obras();
      setObras(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar desempenho");
    }
  }, []);

  useEffect(() => { carregar().finally(() => setLoading(false)); }, [carregar]);

  const onRefresh = async () => { setRefreshing(true); await carregar(); setRefreshing(false); };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#d97706" /></View>;

  const totalExecutado = obras.reduce((sum, o) => sum + o.valorExecutado, 0);
  const totalGeral = obras.reduce((sum, o) => sum + o.valorTotal, 0);
  const progressoMedio = obras.length
    ? Math.round(obras.reduce((sum, o) => sum + o.progresso, 0) / obras.length)
    : 0;

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />}
    >
      <Text style={s.title}>Desempenho</Text>

      {error && <Text style={s.error}>{error}</Text>}

      <View style={s.metricsRow}>
        <MetricCard label="Obras" value={String(obras.length)} sub="em carteira" />
        <MetricCard label="Progresso médio" value={`${progressoMedio}%`} />
        <MetricCard label="Executado" value={formatarBRL(totalExecutado)} sub={`de ${formatarBRL(totalGeral)}`} />
      </View>

      {obras.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Por obra</Text>
          {obras.map((o) => (
            <View key={o.obraId} style={s.card}>
              <Text style={s.cardNome} numberOfLines={1}>{o.nome}</Text>

              <View style={s.row}>
                <View style={s.barWrap}>
                  <View style={s.bar}>
                    <View style={[s.barFill, { width: `${Math.min(o.progresso, 100)}%` as any }]} />
                  </View>
                </View>
                <Text style={s.cardPct}>{o.progresso}%</Text>
              </View>

              <View style={s.financeiro}>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>Total</Text>
                  <Text style={s.finValor}>{formatarBRL(o.valorTotal)}</Text>
                </View>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>Material</Text>
                  <Text style={s.finValor}>{formatarBRL(o.valorMaterial)}</Text>
                </View>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>Mão de obra</Text>
                  <Text style={s.finValor}>{formatarBRL(o.valorMaoDeObra)}</Text>
                </View>
                <View style={[s.finRow, s.finRowExec]}>
                  <Text style={[s.finLabel, { color: "#d97706" }]}>Executado</Text>
                  <Text style={[s.finValor, { color: "#d97706", fontWeight: "700" }]}>{formatarBRL(o.valorExecutado)}</Text>
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, gap: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  error: { color: "#dc2626", fontSize: 14 },
  metricsRow: { flexDirection: "row", gap: 10 },
  metricCard: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", gap: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  metricLabel: { fontSize: 11, color: "#9ca3af", textAlign: "center" },
  metricValue: { fontSize: 18, fontWeight: "800", color: "#d97706" },
  metricSub: { fontSize: 10, color: "#9ca3af", textAlign: "center" },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardNome: { fontSize: 15, fontWeight: "700", color: "#111827" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  barWrap: { flex: 1 },
  bar: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#d97706", borderRadius: 3 },
  cardPct: { fontSize: 13, fontWeight: "700", color: "#d97706", width: 36, textAlign: "right" },
  financeiro: { gap: 6 },
  finRow: { flexDirection: "row", justifyContent: "space-between" },
  finRowExec: { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 6, marginTop: 2 },
  finLabel: { fontSize: 13, color: "#6b7280" },
  finValor: { fontSize: 13, color: "#374151" },
});
