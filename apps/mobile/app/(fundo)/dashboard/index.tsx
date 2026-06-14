import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fundoApi, type FundoOverview, type OperacaoFundo, type LiberacaoFundo } from "../../../lib/api";

function brl(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(v: number, d = 1) { return `${v.toFixed(d)}%`; }

const STATUS_COR: Record<string, string> = { ATIVO: "#16a34a", QUITADO: "#2563eb", VENCIDO: "#ef4444", SUSPENSO: "#f59e0b" };
const LIBERACAO_COR: Record<string, string> = { PENDENTE: "#f59e0b", PROCESSANDO: "#2563eb", CONCLUIDA: "#16a34a", FALHA: "#ef4444" };

function KPI({ label, value, sub, cor }: { label: string; value: string; sub?: string; cor?: string }) {
  return (
    <View style={s.kpi}>
      <Text style={[s.kpiValue, cor ? { color: cor } : {}]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {sub && <Text style={s.kpiSub}>{sub}</Text>}
    </View>
  );
}

type Tab = "overview" | "carteira" | "caixa";

export default function FundoDashboardScreen() {
  const [tab, setTab] = useState<Tab>("overview");
  const [ov, setOv] = useState<FundoOverview | null>(null);
  const [carteira, setCarteira] = useState<OperacaoFundo[]>([]);
  const [caixa, setCaixa] = useState<LiberacaoFundo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [o, c, f] = await Promise.all([fundoApi.overview(), fundoApi.carteira(), fundoApi.fluxoCaixa()]);
      setOv(o); setCarteira(c); setCaixa(f);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { carregar(); }, []);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#0f766e" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.titulo}>Fundo</Text>
        <Text style={s.sub}>Visão financeira</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(["overview", "carteira", "caixa"] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabAtiva]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextAtivo]}>
              {t === "overview" ? "Visão Geral" : t === "carteira" ? "Carteira" : "Fluxo de Caixa"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} tintColor="#0f766e" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Overview */}
        {tab === "overview" && ov && (
          <>
            {/* KPIs primários */}
            <Text style={s.sectionLabel}>Carteira</Text>
            <View style={s.kpiGrid}>
              <KPI label="AUM" value={brl(ov.aum)} sub="sob gestão" />
              <KPI label="Liberado" value={brl(ov.liberado)} sub={pct(ov.pctLiberado) + " do total"} />
            </View>
            <View style={s.kpiGrid}>
              <KPI label="TIR estimada" value={pct(ov.tirEstimadaAnual)} sub="a.a." cor="#0f766e" />
              <KPI label="Taxa média" value={pct(ov.taxaMediaMensal) + "/mês"} />
            </View>

            <Text style={s.sectionLabel}>Risco</Text>
            <View style={s.kpiGrid}>
              <KPI label="NPL" value={pct(ov.npl)} sub="inadimplência" cor={ov.npl > 5 ? "#ef4444" : ov.npl > 2 ? "#f59e0b" : "#16a34a"} />
              <KPI label="Inadimplentes" value={String(ov.operacoesInadimplentes)} sub="operações" cor={ov.operacoesInadimplentes > 0 ? "#ef4444" : undefined} />
            </View>

            <Text style={s.sectionLabel}>Operações</Text>
            <View style={s.kpiGrid}>
              <KPI label="Ativas" value={String(ov.operacoesAtivas)} />
              <KPI label="Quitadas" value={String(ov.operacoesQuitadas)} cor="#2563eb" />
            </View>
            <View style={s.kpiGrid}>
              <KPI label="Obras em execução" value={String(ov.obrasAtivas)} />
              <KPI label="Total carteira" value={String(ov.totalOperacoes)} />
            </View>

            {ov.filaLiberacaoCount > 0 && (
              <>
                <Text style={s.sectionLabel}>Fila de liberação</Text>
                <View style={s.alertCard}>
                  <Ionicons name="time-outline" size={20} color="#f59e0b" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.alertText}>{ov.filaLiberacaoCount} liberação{ov.filaLiberacaoCount !== 1 ? "ões" : ""} pendente{ov.filaLiberacaoCount !== 1 ? "s" : ""}</Text>
                    <Text style={s.alertSub}>{brl(ov.filaLiberacaoValor)} em processamento</Text>
                  </View>
                </View>
              </>
            )}
          </>
        )}

        {/* Carteira */}
        {tab === "carteira" && (
          <>
            {carteira.length === 0 ? (
              <View style={s.center}><Text style={s.emptyText}>Nenhuma operação cadastrada</Text></View>
            ) : (
              carteira.map((op) => (
                <View key={op.creditoId} style={s.opCard}>
                  <View style={s.opHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.opNome} numberOfLines={1}>{op.obraNome}</Text>
                      <Text style={s.opConstrutor}>{op.construtor}</Text>
                    </View>
                    <View style={[s.statusChip, { backgroundColor: (STATUS_COR[op.status] ?? "#6b7280") + "20" }]}>
                      <Text style={[s.statusText, { color: STATUS_COR[op.status] ?? "#6b7280" }]}>{op.status}</Text>
                    </View>
                  </View>

                  {/* Barra progresso físico */}
                  <View style={s.progressRow}>
                    <Text style={s.progressLabel}>Físico</Text>
                    <View style={s.progressBar}>
                      <View style={[s.progressFill, { width: `${op.progressoFisico}%`, backgroundColor: "#0f766e" }]} />
                    </View>
                    <Text style={s.progressPct}>{op.progressoFisico}%</Text>
                  </View>

                  {/* Barra progresso financeiro */}
                  <View style={s.progressRow}>
                    <Text style={s.progressLabel}>Financeiro</Text>
                    <View style={s.progressBar}>
                      <View style={[s.progressFill, { width: `${op.pctLiberado}%`, backgroundColor: "#2563eb" }]} />
                    </View>
                    <Text style={s.progressPct}>{op.pctLiberado}%</Text>
                  </View>

                  <View style={s.opMeta}>
                    <Text style={s.opMetaText}>{brl(op.valorAprovado)}</Text>
                    <Text style={s.opMetaText}>{pct(op.taxaMensal)}/mês</Text>
                    <Text style={s.opMetaText}>{op.prazoMeses}m</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Fluxo de Caixa */}
        {tab === "caixa" && (
          <>
            {caixa.length === 0 ? (
              <View style={s.center}><Text style={s.emptyText}>Nenhuma liberação registrada</Text></View>
            ) : (
              caixa.map((l) => (
                <View key={l.liberacaoId} style={s.caixaCard}>
                  <View style={[s.caixaDot, { backgroundColor: LIBERACAO_COR[l.status] ?? "#6b7280" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.caixaObra} numberOfLines={1}>{l.obraNome}</Text>
                    <Text style={s.caixaData}>{new Date(l.criadoEm).toLocaleDateString("pt-BR")}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.caixaValor}>{brl(l.valor)}</Text>
                    <Text style={[s.caixaStatus, { color: LIBERACAO_COR[l.status] ?? "#6b7280" }]}>{l.status}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  titulo: { fontSize: 22, fontWeight: "700", color: "#1e3a5f" },
  sub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  tabs: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabAtiva: { borderBottomWidth: 2.5, borderBottomColor: "#0f766e" },
  tabText: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  tabTextAtivo: { color: "#0f766e", fontWeight: "700" },
  sectionLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  kpiGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpi: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#f3f4f6" },
  kpiValue: { fontSize: 20, fontWeight: "700", color: "#1e3a5f" },
  kpiLabel: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  kpiSub: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  alertCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fffbeb", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#fde68a" },
  alertText: { fontSize: 14, fontWeight: "600", color: "#92400e" },
  alertSub: { fontSize: 12, color: "#b45309", marginTop: 2 },
  opCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#f3f4f6" },
  opHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  opNome: { fontSize: 14, fontWeight: "600", color: "#111827" },
  opConstrutor: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  statusChip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: "700" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  progressLabel: { fontSize: 11, color: "#6b7280", width: 60 },
  progressBar: { flex: 1, height: 8, backgroundColor: "#f3f4f6", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressPct: { fontSize: 11, color: "#374151", fontWeight: "600", width: 32, textAlign: "right" },
  opMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f9fafb" },
  opMetaText: { fontSize: 12, color: "#6b7280" },
  caixaCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, gap: 10, borderWidth: 1, borderColor: "#f3f4f6" },
  caixaDot: { width: 10, height: 10, borderRadius: 5 },
  caixaObra: { fontSize: 14, fontWeight: "500", color: "#111827" },
  caixaData: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  caixaValor: { fontSize: 14, fontWeight: "700", color: "#111827" },
  caixaStatus: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  emptyText: { fontSize: 14, color: "#9ca3af" },
});
