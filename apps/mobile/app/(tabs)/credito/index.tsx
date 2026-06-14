import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, StatusBar, Platform,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import Slider from "@react-native-community/slider";
import { creditoApi, type Credito } from "../../../lib/api";

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
  red:     "#EF4444",
};

function formatarBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatarPercentual(v: number) {
  return `${(v * 100).toFixed(2).replace(".", ",")}%`;
}
function simularCredito(valor: number, taxa: number, prazo: number) {
  if (prazo === 0 || taxa === 0) return { parcelaMensal: 0, totalPago: 0, totalJuros: 0, cet: 0 };
  const parcela = (valor * taxa * Math.pow(1 + taxa, prazo)) / (Math.pow(1 + taxa, prazo) - 1);
  const totalPago  = parcela * prazo;
  const totalJuros = totalPago - valor;
  const cet = Math.pow(1 + taxa, 12) - 1;
  return { parcelaMensal: parcela, totalPago, totalJuros, cet };
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  ATIVO:        { label: "Ativo",        bg: C.mintPale, color: "#166534" },
  QUITADO:      { label: "Quitado",      bg: "#F3F4F6",  color: "#6B7280" },
  INADIMPLENTE: { label: "Inadimplente", bg: "#FEE2E2",  color: "#991B1B" },
};

const TAXA_MENSAL = 0.0099;

export default function CreditoScreen() {
  const [creditos, setCreditos]             = useState<Credito[]>([]);
  const [loading, setLoading]               = useState(true);
  const [valorSolicitado, setValorSolicitado] = useState(150_000);
  const [prazoMeses, setPrazoMeses]         = useState(60);

  const resultado = useMemo(
    () => simularCredito(valorSolicitado, TAXA_MENSAL, prazoMeses),
    [valorSolicitado, prazoMeses],
  );

  useEffect(() => {
    creditoApi.meus()
      .then(setCreditos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crédito</Text>
        <Text style={styles.headerSub}>Acompanhe e simule seu financiamento</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── MEUS CRÉDITOS ── */}
        <Text style={styles.sectionTitle}>Meus Créditos</Text>

        {loading ? (
          <ActivityIndicator color={C.blue} style={{ marginVertical: 16 }} />
        ) : creditos.length > 0 ? (
          creditos.map((c) => {
            const meta = STATUS_MAP[c.status] ?? { label: c.status, bg: C.surface, color: C.gray };
            const pct = c.valorAprovado > 0
              ? Math.min(100, Math.round((c.valorLiberado / c.valorAprovado) * 100))
              : 0;
            return (
              <View key={c.creditoId} style={styles.creditCard}>
                <View style={styles.creditCardTop}>
                  <View>
                    <Text style={styles.creditCardLabel}>Crédito aprovado</Text>
                    <Text style={styles.creditCardValor}>{formatarBRL(c.valorAprovado)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>

                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` as any }]} />
                </View>
                <Text style={styles.barLabel}>{pct}% liberado · {formatarBRL(c.valorLiberado)}</Text>

                <View style={styles.creditMeta}>
                  <MetaItem label="Taxa mensal" value={formatarPercentual(c.taxaMensal)} />
                  <MetaItem label="Prazo"        value={`${c.prazoMeses} meses`} />
                  <MetaItem label="A liberar"    value={formatarBRL(c.valorAprovado - c.valorLiberado)} />
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={styles.emptyTitle}>Nenhum crédito ativo</Text>
            <Text style={styles.emptySub}>
              Solicite seu crédito pelo painel web para aprovação do comitê
            </Text>
          </View>
        )}

        {/* ── SIMULADOR ── */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Simulador</Text>

        <View style={styles.sliderCard}>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Valor desejado</Text>
            <Text style={styles.sliderValue}>{formatarBRL(valorSolicitado)}</Text>
          </View>
          <Slider
            minimumValue={10_000}
            maximumValue={1_000_000}
            step={5_000}
            value={valorSolicitado}
            onValueChange={setValorSolicitado}
            minimumTrackTintColor={C.blue}
            maximumTrackTintColor={C.border}
            thumbTintColor={C.blue}
          />
        </View>

        <View style={styles.sliderCard}>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Prazo</Text>
            <Text style={styles.sliderValue}>{prazoMeses} meses</Text>
          </View>
          <Slider
            minimumValue={12}
            maximumValue={180}
            step={12}
            value={prazoMeses}
            onValueChange={setPrazoMeses}
            minimumTrackTintColor={C.blue}
            maximumTrackTintColor={C.border}
            thumbTintColor={C.blue}
          />
        </View>

        {/* Resultado */}
        <View style={styles.resultCard}>
          <View style={styles.resultTop}>
            <Text style={styles.resultTopLabel}>Parcela mensal estimada</Text>
            <Text style={styles.resultTopValue}>{formatarBRL(resultado.parcelaMensal)}</Text>
          </View>
          <View style={styles.divider} />
          <ResultRow label="Total pago"    value={formatarBRL(resultado.totalPago)} />
          <ResultRow label="Total de juros" value={formatarBRL(resultado.totalJuros)} />
          <ResultRow label="CET ao ano"    value={formatarPercentual(resultado.cet)} />
          <Text style={styles.disclaimer}>
            * Simulação aproximada. Taxa de {formatarPercentual(TAXA_MENSAL)}/mês. Sujeita a análise de crédito.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: 11, color: C.gray }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
      <Text style={{ color: "#93C5FD", fontSize: 13 }}>{label}</Text>
      <Text style={{ color: C.white, fontSize: 14, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.navy },
  scroll: { flex: 1, backgroundColor: C.surface },

  header: {
    paddingTop:        Platform.OS === "ios" ? 60 : 40,
    paddingBottom:     24,
    paddingHorizontal: 20,
    backgroundColor:   C.navy,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: C.white, letterSpacing: 0.2 },
  headerSub:   { fontSize: 13, color: "#94A3B8", marginTop: 4 },

  content: { padding: 16, gap: 12, paddingBottom: 48 },

  sectionTitle: { fontSize: 15, fontWeight: "700", color: C.ink },

  creditCard: {
    backgroundColor: C.white, borderRadius: 18, padding: 18,
    gap: 10,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  creditCardTop:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  creditCardLabel: { fontSize: 12, color: C.gray },
  creditCardValor: { fontSize: 26, fontWeight: "800", color: C.ink, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  barTrack: { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: "hidden" },
  barFill:  { height: 6, backgroundColor: C.mint, borderRadius: 3 },
  barLabel: { fontSize: 12, color: C.gray },
  creditMeta: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },

  emptyCard: {
    backgroundColor: C.white, borderRadius: 18, padding: 28,
    alignItems: "center", gap: 8,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.ink },
  emptySub:   { fontSize: 13, color: C.grayL, textAlign: "center", lineHeight: 20 },

  sliderCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6,
  },
  sliderRow:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  sliderLabel: { fontSize: 13, color: C.gray, fontWeight: "500" },
  sliderValue: { fontSize: 14, color: C.blue, fontWeight: "700" },

  resultCard: {
    backgroundColor: C.navy, borderRadius: 20, padding: 20, gap: 2,
  },
  resultTop: {
    alignItems: "center", paddingBottom: 16,
  },
  resultTopLabel: { fontSize: 13, color: "#94A3B8" },
  resultTopValue: { fontSize: 32, fontWeight: "800", color: C.white, marginTop: 4 },
  divider: { height: 1, backgroundColor: "#1E3A8A", marginVertical: 8 },
  disclaimer: { fontSize: 10, color: "#475569", marginTop: 8, lineHeight: 15 },
});
