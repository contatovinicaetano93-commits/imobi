import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useSimuladorCredito } from "@imbobi/core/hooks";
import { formatarBRL, formatarPercentual } from "@imbobi/core";
import Slider from "@react-native-community/slider";
import { creditoApi, type Credito } from "../../../lib/api";

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  ATIVO:    { label: "Ativo",    bg: "#dcfce7", color: "#166534" },
  QUITADO:  { label: "Quitado",  bg: "#f3f4f6", color: "#6b7280" },
  INADIMPLENTE: { label: "Inadimplente", bg: "#fee2e2", color: "#991b1b" },
};

export default function CreditoScreen() {
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [loading, setLoading] = useState(true);

  const { valorSolicitado, setValorSolicitado, prazoMeses, setPrazoMeses, resultado } =
    useSimuladorCredito();

  useEffect(() => {
    creditoApi.meus()
      .then(setCreditos)
      .catch(() => { /* ignore if no credits yet */ })
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Crédito</Text>

      {/* Créditos ativos */}
      {loading ? (
        <ActivityIndicator color="#16a34a" style={{ marginVertical: 12 }} />
      ) : creditos.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Meus Créditos</Text>
          {creditos.map((c) => {
            const meta = STATUS_LABEL[c.status] ?? { label: c.status, bg: "#f3f4f6", color: "#374151" };
            const pctLiberado = c.valorAprovado > 0
              ? Math.round((c.valorLiberado / c.valorAprovado) * 100)
              : 0;
            return (
              <View key={c.creditoId} style={styles.creditCard}>
                <View style={styles.creditHeader}>
                  <Text style={styles.creditLabel}>Crédito aprovado</Text>
                  <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>

                <Text style={styles.creditValor}>{formatarBRL(c.valorAprovado)}</Text>

                <View style={styles.progressRow}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${pctLiberado}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{pctLiberado}% liberado</Text>
                </View>

                <View style={styles.creditMeta}>
                  <CreditMetaItem label="Liberado" value={formatarBRL(c.valorLiberado)} />
                  <CreditMetaItem label="Taxa mensal" value={formatarPercentual(c.taxaMensal)} />
                  <CreditMetaItem label="Prazo" value={`${c.prazoMeses}m`} />
                </View>
              </View>
            );
          })}
        </>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>💳</Text>
          <Text style={styles.emptyText}>Nenhum crédito ativo</Text>
          <Text style={styles.emptySubtext}>Solicite seu crédito pelo painel web para aprovação do comitê</Text>
        </View>
      )}

      {/* Simulador */}
      <Text style={styles.sectionTitle}>Simulador</Text>

      <View style={styles.sliderBlock}>
        <View style={styles.sliderLabel}>
          <Text style={styles.label}>Valor desejado</Text>
          <Text style={styles.sliderValue}>{formatarBRL(valorSolicitado)}</Text>
        </View>
        <Slider
          minimumValue={10000}
          maximumValue={1000000}
          step={5000}
          value={valorSolicitado}
          onValueChange={setValorSolicitado}
          minimumTrackTintColor="#16a34a"
          thumbTintColor="#16a34a"
        />
      </View>

      <View style={styles.sliderBlock}>
        <View style={styles.sliderLabel}>
          <Text style={styles.label}>Prazo</Text>
          <Text style={styles.sliderValue}>{prazoMeses} meses</Text>
        </View>
        <Slider
          minimumValue={12}
          maximumValue={180}
          step={12}
          value={prazoMeses}
          onValueChange={setPrazoMeses}
          minimumTrackTintColor="#16a34a"
          thumbTintColor="#16a34a"
        />
      </View>

      <View style={styles.resultCard}>
        <ResultRow label="Parcela mensal" value={formatarBRL(resultado.parcelaMensal)} big />
        <View style={styles.divider} />
        <ResultRow label="Total pago" value={formatarBRL(resultado.totalPago)} />
        <ResultRow label="Total de juros" value={formatarBRL(resultado.totalJuros)} />
        <ResultRow label="CET ao ano" value={formatarPercentual(resultado.cet)} />
      </View>
    </ScrollView>
  );
}

function CreditMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 11, color: "#6b7280" }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>{value}</Text>
    </View>
  );
}

function ResultRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: "#dcfce7", fontSize: 14 }}>{label}</Text>
      <Text style={{ color: "#fff", fontSize: big ? 22 : 15, fontWeight: big ? "800" : "600" }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 20, paddingTop: 56, gap: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  creditCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 18,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 12,
  },
  creditHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  creditLabel: { fontSize: 13, color: "#6b7280" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  creditValor: { fontSize: 28, fontWeight: "800", color: "#111827" },
  progressRow: { gap: 6 },
  progressBar: { height: 6, backgroundColor: "#f3f4f6", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: "#16a34a", borderRadius: 3 },
  progressText: { fontSize: 12, color: "#6b7280" },
  creditMeta: { flexDirection: "row", justifyContent: "space-between", paddingTop: 4 },
  emptyCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 24,
    alignItems: "center", gap: 8,
  },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#374151" },
  emptySubtext: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
  sliderBlock: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8,
  },
  sliderLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  sliderValue: { fontSize: 15, color: "#16a34a", fontWeight: "700" },
  resultCard: { backgroundColor: "#16a34a", borderRadius: 20, padding: 20, gap: 4 },
  divider: { height: 1, backgroundColor: "#15803d", marginVertical: 8 },
});
