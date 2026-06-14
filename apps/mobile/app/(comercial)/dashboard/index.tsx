import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, StatusBar, Platform,
} from "react-native";
import { useEffect, useState } from "react";
import { comercialApi, type ComercialOverview } from "../../../lib/api";

const C = {
  blue:   "#1B4FD8",
  navy:   "#0C1A3D",
  mint:   "#22C55E",
  ink:    "#0F172A",
  gray:   "#64748B",
  grayL:  "#94A3B8",
  surface:"#F8FAFC",
  border: "#E2E8F0",
  white:  "#FFFFFF",
  amber:  "#F59E0B",
  red:    "#EF4444",
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ComercialDashboard() {
  const [data, setData]       = useState<ComercialOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    comercialApi.overview()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mes = data?.mesAtual;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={s.header}>
        <Text style={s.headerTitle}>Dashboard Comercial</Text>
        <Text style={s.headerSub}>Performance e pipeline de vendas</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={C.blue} style={{ marginVertical: 32 }} />
        ) : !data ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Sem dados disponíveis</Text>
            <Text style={s.emptySub}>Verifique sua conexão e tente novamente.</Text>
          </View>
        ) : (
          <>
            {/* ── Destaque do mês ── */}
            <View style={s.highlight}>
              <Text style={s.highlightLabel}>Comissão do mês</Text>
              <Text style={s.highlightValue}>{formatBRL(mes?.comissaoMes ?? 0)}</Text>
              <View style={s.highlightRow}>
                <Text style={s.highlightSub}>{mes?.negociosFechados ?? 0} negócios fechados</Text>
                {(mes?.variacaoComissao ?? 0) >= 0 ? (
                  <Text style={[s.pill, { backgroundColor: "#DCFCE7", color: "#166534" }]}>
                    +{mes?.variacaoComissao?.toFixed(1)}% vs mês ant.
                  </Text>
                ) : (
                  <Text style={[s.pill, { backgroundColor: "#FEE2E2", color: "#991B1B" }]}>
                    {mes?.variacaoComissao?.toFixed(1)}% vs mês ant.
                  </Text>
                )}
              </View>
            </View>

            {/* ── KPIs ── */}
            <Text style={s.section}>KPIs do Mês</Text>
            <View style={s.kpiGrid}>
              <KpiCard label="Leads"        value={String(data.leadsAtivos)}   sub="ativos"           bg={C.white} />
              <KpiCard label="Propostas"    value={String(data.propostasMes)}   sub="este mês"        bg={C.white} />
              <KpiCard label="Conversão"    value={`${data.taxaConversao.toFixed(1)}%`} sub="propostas→crédito" bg={C.white} />
              <KpiCard label="Créditos"     value={String(data.creditosAprovados)} sub="aprovados"    bg={C.white} />
              <KpiCard label="Vol. Crédito" value={formatBRL(data.volumeCredito)} sub="total"         bg={C.white} />
              <KpiCard label="Ticket Médio" value={formatBRL(data.ticketMedio)}   sub="por negócio"   bg={C.white} />
            </View>

            {/* ── Comissões acumuladas ── */}
            <Text style={s.section}>Acumulado do Ano</Text>
            <View style={s.acumCard}>
              <Row label="Total comissões" value={formatBRL(data.comissaoAno)} />
              <Row label="Negócios fechados" value={String(data.negociosAno)} />
              <Row label="Volume intermediado" value={formatBRL(data.volumeAno)} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function KpiCard({ label, value, sub, bg }: { label: string; value: string; sub: string; bg: string }) {
  return (
    <View style={[s.kpiCard, { backgroundColor: bg }]}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiSub}>{sub}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <Text style={{ color: C.gray, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: C.ink, fontSize: 14, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.navy },
  scroll: { flex: 1, backgroundColor: C.surface },
  header: {
    paddingTop:        Platform.OS === "ios" ? 60 : 40,
    paddingBottom:     24,
    paddingHorizontal: 20,
    backgroundColor:   C.navy,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: C.white, letterSpacing: 0.2 },
  headerSub:   { fontSize: 13, color: C.grayL, marginTop: 4 },
  content: { padding: 16, gap: 14, paddingBottom: 48 },

  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.ink },
  emptySub:   { fontSize: 13, color: C.grayL, textAlign: "center" },

  highlight: {
    backgroundColor: C.blue, borderRadius: 20, padding: 24, gap: 6,
  },
  highlightLabel: { fontSize: 13, color: "#93C5FD" },
  highlightValue: { fontSize: 34, fontWeight: "800", color: C.white },
  highlightRow:   { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  highlightSub:   { fontSize: 13, color: "#BFDBFE" },
  pill: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },

  section: { fontSize: 15, fontWeight: "700", color: C.ink, marginTop: 4 },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: {
    width: "47%", borderRadius: 14, padding: 14, gap: 2,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  kpiLabel: { fontSize: 11, color: C.gray, fontWeight: "500" },
  kpiValue: { fontSize: 20, fontWeight: "800", color: C.ink, marginTop: 2 },
  kpiSub:   { fontSize: 11, color: C.grayL },

  acumCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
});
