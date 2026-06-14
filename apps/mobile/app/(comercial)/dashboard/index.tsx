import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { comercialApi, type ComercialStats, type Stage, type Lead } from "../../../lib/api";

const STAGES_DEFAULT = ["PROSPECÇÃO", "QUALIFICAÇÃO", "PROPOSTA", "NEGOCIAÇÃO", "FECHAMENTO"];

function ScoreBadge({ score }: { score: number }) {
  const cor = score >= 70 ? "#16a34a" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <View style={[s.scoreBadge, { backgroundColor: cor + "20" }]}>
      <Text style={[s.scoreText, { color: cor }]}>{score}</Text>
    </View>
  );
}

export default function ComercialDashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<ComercialStats | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [s, st, l] = await Promise.all([
        comercialApi.stats(),
        comercialApi.stages(),
        comercialApi.leads({ limit: "50" }),
      ]);
      setStats(s);
      setStages(st);
      setLeads(l.leads);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { carregar(); }, []);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#ea580c" /></View>;

  const contPorStage = stages.map((st) => ({
    ...st,
    count: leads.filter((l) => l.stageId === st.stageId).length,
  }));

  const hotLeads = leads.filter((l) => (l.scoreHistorico[0]?.scoreFinal ?? 0) >= 70);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} tintColor="#ea580c" />}
    >
      <View style={s.header}>
        <Text style={s.titulo}>Comercial</Text>
        <Text style={s.sub}>Pipeline de leads</Text>
      </View>

      {stats && (
        <View style={s.kpiRow}>
          <View style={s.kpi}>
            <Text style={s.kpiValue}>{stats.totalLeads}</Text>
            <Text style={s.kpiLabel}>Total leads</Text>
          </View>
          <View style={s.kpi}>
            <Text style={[s.kpiValue, { color: "#ea580c" }]}>{stats.conversionRate}%</Text>
            <Text style={s.kpiLabel}>Conversão</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiValue}>{stats.avgScore}</Text>
            <Text style={s.kpiLabel}>Score médio</Text>
          </View>
          <View style={s.kpi}>
            <Text style={[s.kpiValue, { color: "#16a34a" }]}>{hotLeads.length}</Text>
            <Text style={s.kpiLabel}>Score ≥70</Text>
          </View>
        </View>
      )}

      {/* Funil */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Funil</Text>
        {contPorStage.map((st, i) => {
          const pct = stats && stats.totalLeads > 0 ? (st.count / stats.totalLeads) * 100 : 0;
          return (
            <TouchableOpacity
              key={st.stageId}
              style={s.funnelRow}
              onPress={() => router.push("/(comercial)/pipeline" as any)}
            >
              <Text style={s.funnelNome}>{st.nome}</Text>
              <View style={s.funnelBar}>
                <View style={[s.funnelFill, { width: `${pct}%`, backgroundColor: st.cor }]} />
              </View>
              <Text style={[s.funnelCount, { color: st.cor }]}>{st.count}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Hot leads */}
      {hotLeads.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Score ≥ 70 — alta probabilidade</Text>
          {hotLeads.slice(0, 5).map((l) => (
            <TouchableOpacity
              key={l.leadId}
              style={s.leadCard}
              onPress={() => router.push(`/(comercial)/leads/${l.leadId}` as any)}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.leadNome}>{l.clienteNome}</Text>
                <Text style={s.leadStage}>{l.stage?.nome}</Text>
              </View>
              <ScoreBadge score={Math.round(l.scoreHistorico[0]?.scoreFinal ?? 0)} />
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  titulo: { fontSize: 22, fontWeight: "700", color: "#1e3a5f" },
  sub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  kpiRow: { flexDirection: "row", padding: 16, gap: 10 },
  kpi: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6" },
  kpiValue: { fontSize: 20, fontWeight: "700", color: "#1e3a5f" },
  kpiLabel: { fontSize: 11, color: "#6b7280", marginTop: 4, textAlign: "center" },
  section: { paddingHorizontal: 16, paddingBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  funnelRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  funnelNome: { fontSize: 12, color: "#374151", width: 100 },
  funnelBar: { flex: 1, height: 10, backgroundColor: "#f3f4f6", borderRadius: 5, overflow: "hidden" },
  funnelFill: { height: "100%", borderRadius: 5 },
  funnelCount: { fontSize: 13, fontWeight: "700", width: 24, textAlign: "right" },
  leadCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, gap: 8, borderWidth: 1, borderColor: "#f3f4f6" },
  leadNome: { fontSize: 14, fontWeight: "600", color: "#111827" },
  leadStage: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  scoreBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText: { fontSize: 13, fontWeight: "700" },
});
