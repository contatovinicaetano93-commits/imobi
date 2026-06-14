import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, StatusBar, Platform,
} from "react-native";
import { useEffect, useState } from "react";
import { fundoApi, type FundoOverview } from "../../../lib/api";

const C = {
  blue:    "#1B4FD8",
  navy:    "#0C1A3D",
  mint:    "#22C55E",
  mintPale:"#DCFCE7",
  ink:     "#0F172A",
  gray:    "#64748B",
  grayL:   "#94A3B8",
  surface: "#F8FAFC",
  border:  "#E2E8F0",
  white:   "#FFFFFF",
  amber:   "#F59E0B",
  red:     "#EF4444",
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatPct(v: number) {
  return `${(v * 100).toFixed(2).replace(".", ",")}%`;
}

export default function CarteiraScreen() {
  const [data, setData]       = useState<FundoOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fundoApi.overview()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={s.header}>
        <Text style={s.headerTitle}>Carteira do Fundo</Text>
        <Text style={s.headerSub}>Visão consolidada dos ativos</Text>
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
            {/* ── Patrimônio ── */}
            <View style={s.patrimonioCard}>
              <Text style={s.patrimonioLabel}>Patrimônio Líquido</Text>
              <Text style={s.patrimonioValue}>{formatBRL(data.patrimonioLiquido)}</Text>
              <View style={s.patrimonioRow}>
                <Text style={s.patrimonioSub}>PL inicial: {formatBRL(data.patrimonioInicial)}</Text>
                <Text style={[s.pill, { backgroundColor: data.retornoAno >= 0 ? "#DCFCE7" : "#FEE2E2",
                  color: data.retornoAno >= 0 ? "#166534" : "#991B1B" }]}>
                  {data.retornoAno >= 0 ? "+" : ""}{formatPct(data.retornoAno)} a.a.
                </Text>
              </View>
            </View>

            {/* ── Resumo da carteira ── */}
            <Text style={s.section}>Composição da Carteira</Text>
            <View style={s.composicaoCard}>
              <ComposicaoRow label="Crédito imobiliário" value={formatBRL(data.totalCredito)} pct={data.pctCredito} color={C.blue} />
              <ComposicaoRow label="CRI / Debêntures"    value={formatBRL(data.totalCri)}     pct={data.pctCri}     color="#8B5CF6" />
              <ComposicaoRow label="Caixa / Liquidez"    value={formatBRL(data.totalCaixa)}   pct={data.pctCaixa}   color={C.mint} />
            </View>

            {/* ── KPIs principais ── */}
            <Text style={s.section}>Indicadores</Text>
            <View style={s.kpiGrid}>
              <KpiCard label="Retorno mês"    value={formatPct(data.retornoMes)}        cor={C.blue} />
              <KpiCard label="TIR do fundo"   value={formatPct(data.tirFundo)}           cor={C.blue} />
              <KpiCard label="Inadimplência"  value={formatPct(data.inadimplencia)}      cor={data.inadimplencia > 0.03 ? C.red : C.mint} />
              <KpiCard label="LTV médio"      value={formatPct(data.ltvMedio)}           cor={C.ink} />
              <KpiCard label="Operações"      value={String(data.totalOperacoes)}        cor={C.ink} />
              <KpiCard label="Prazo médio"    value={`${data.prazoMedioMeses} meses`}   cor={C.ink} />
            </View>

            {/* ── Distribuição geográfica ── */}
            {data.distribuicaoUF?.length > 0 && (
              <>
                <Text style={s.section}>Distribuição por UF</Text>
                <View style={s.ufCard}>
                  {data.distribuicaoUF.map((uf) => (
                    <View key={uf.uf} style={s.ufRow}>
                      <Text style={s.ufLabel}>{uf.uf}</Text>
                      <View style={s.ufBarTrack}>
                        <View style={[s.ufBarFill, { width: `${(uf.pct * 100).toFixed(0)}%` as any }]} />
                      </View>
                      <Text style={s.ufPct}>{formatPct(uf.pct)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ComposicaoRow({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <View style={{ gap: 4, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 13, color: C.gray }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink }}>{value}</Text>
      </View>
      <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, overflow: "hidden" }}>
        <View style={{ height: 4, width: `${(pct * 100).toFixed(0)}%` as any, backgroundColor: color, borderRadius: 2 }} />
      </View>
      <Text style={{ fontSize: 11, color: C.grayL, textAlign: "right" }}>{formatPct(pct)}</Text>
    </View>
  );
}

function KpiCard({ label, value, cor }: { label: string; value: string; cor: string }) {
  return (
    <View style={s.kpiCard}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiValue, { color: cor }]}>{value}</Text>
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

  patrimonioCard: {
    backgroundColor: C.navy, borderRadius: 20, padding: 24, gap: 6,
    borderWidth: 1, borderColor: "#1E3A8A",
  },
  patrimonioLabel: { fontSize: 13, color: C.grayL },
  patrimonioValue: { fontSize: 34, fontWeight: "800", color: C.white },
  patrimonioRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  patrimonioSub:   { fontSize: 12, color: C.grayL },
  pill: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },

  section: { fontSize: 15, fontWeight: "700", color: C.ink, marginTop: 4 },

  composicaoCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: {
    width: "47%", backgroundColor: C.white, borderRadius: 14, padding: 14,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  kpiLabel: { fontSize: 11, color: C.gray },
  kpiValue: { fontSize: 22, fontWeight: "800", marginTop: 4 },

  ufCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16, gap: 4,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6,
  },
  ufRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  ufLabel: { width: 30, fontSize: 12, fontWeight: "700", color: C.ink },
  ufBarTrack: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: "hidden" },
  ufBarFill:  { height: 6, backgroundColor: C.blue, borderRadius: 3 },
  ufPct: { width: 44, fontSize: 11, color: C.gray, textAlign: "right" },
});
