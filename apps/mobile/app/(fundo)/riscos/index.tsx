import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, StatusBar, Platform,
} from "react-native";
import { useEffect, useState } from "react";
import { fundoApi, type FundoRiscos } from "../../../lib/api";

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
function formatPct(v: number) {
  return `${(v * 100).toFixed(2).replace(".", ",")}%`;
}

const RISCO_COR: Record<string, string> = {
  BAIXO:  C.mint,
  MEDIO:  C.amber,
  ALTO:   C.red,
};

export default function RiscosScreen() {
  const [data, setData]       = useState<FundoRiscos | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fundoApi.riscos()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={s.header}>
        <Text style={s.headerTitle}>Gestão de Riscos</Text>
        <Text style={s.headerSub}>Exposição e concentração da carteira</Text>
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
            {/* ── Nível de risco geral ── */}
            <View style={[s.riscoGeral, { borderColor: RISCO_COR[data.nivelRisco] ?? C.gray }]}>
              <Text style={s.riscoGeralLabel}>Nível de Risco Geral</Text>
              <Text style={[s.riscoGeralValue, { color: RISCO_COR[data.nivelRisco] ?? C.gray }]}>
                {data.nivelRisco}
              </Text>
              <Text style={s.riscoGeralSub}>{data.descricaoRisco}</Text>
            </View>

            {/* ── Inadimplência ── */}
            <Text style={s.section}>Inadimplência</Text>
            <View style={s.card}>
              <Row label="Taxa atual"         value={formatPct(data.inadimplencia.taxaAtual)} destaque={data.inadimplencia.taxaAtual > 0.03} />
              <Row label="Em atraso (15-90d)" value={formatBRL(data.inadimplencia.emAtraso)} />
              <Row label="Acima de 90 dias"   value={formatBRL(data.inadimplencia.acima90dias)} />
              <Row label="PDD constituída"     value={formatBRL(data.inadimplencia.pdd)} />
            </View>

            {/* ── Concentração ── */}
            <Text style={s.section}>Concentração</Text>
            <View style={s.card}>
              <Row label="Maior devedor (% carteira)" value={formatPct(data.concentracao.maiorDevedor)} destaque={data.concentracao.maiorDevedor > 0.1} />
              <Row label="Top 5 devedores"            value={formatPct(data.concentracao.top5)} />
              <Row label="Maior UF"                   value={`${data.concentracao.maiorUF} (${formatPct(data.concentracao.pctMaiorUF)})`} />
            </View>

            {/* ── Duration e liquidez ── */}
            <Text style={s.section}>Duration e Liquidez</Text>
            <View style={s.card}>
              <Row label="Duration média"    value={`${data.duration.toFixed(1)} anos`} />
              <Row label="Liquidez diária"   value={formatBRL(data.liquidezDisponivel)} />
              <Row label="Caixa livre"       value={formatBRL(data.caixaLivre)} />
              <Row label="Próx. vencimentos (30d)" value={formatBRL(data.vencimentos30dias)} />
            </View>

            {/* ── VaR ── */}
            <Text style={s.section}>Value at Risk (VaR)</Text>
            <View style={s.card}>
              <Row label="VaR diário (95%)"   value={formatBRL(data.var95Diario)} />
              <Row label="VaR mensal (99%)"   value={formatBRL(data.var99Mensal)} />
              <Row label="Perda máxima histórica" value={formatBRL(data.perdaMaximaHistorica)} destaque />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <Text style={{ color: C.gray, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: destaque ? C.red : C.ink, fontSize: 14, fontWeight: "700" }}>{value}</Text>
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
  headerTitle: { fontSize: 26, fontWeight: "800", color: C.white },
  headerSub:   { fontSize: 13, color: C.grayL, marginTop: 4 },
  content: { padding: 16, gap: 14, paddingBottom: 48 },

  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.ink },
  emptySub:   { fontSize: 13, color: C.grayL },

  riscoGeral: {
    backgroundColor: C.white, borderRadius: 16, padding: 20, gap: 6,
    borderWidth: 2, alignItems: "center",
  },
  riscoGeralLabel: { fontSize: 13, color: C.gray },
  riscoGeralValue: { fontSize: 32, fontWeight: "800" },
  riscoGeralSub:   { fontSize: 13, color: C.gray, textAlign: "center" },

  section: { fontSize: 15, fontWeight: "700", color: C.ink },
  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
});
