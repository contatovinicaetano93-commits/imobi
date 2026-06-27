import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSimuladorCredito } from "@imbobi/core/hooks";
import { formatarBRL, formatarPercentual } from "@imbobi/core";
import { useEffect, useState } from "react";
import Slider from "@react-native-community/slider";
import { creditoApi } from "../../../lib/api";

export default function CreditoScreen() {
  const [taxaFixada, setTaxaFixada] = useState<number | null>(null);
  const [prazoMax, setPrazoMax] = useState<number | null>(null);
  const [loadingTaxa, setLoadingTaxa] = useState(true);

  useEffect(() => {
    creditoApi.meus().then((creditos) => {
      if (creditos && creditos.length > 0) {
        // último crédito define a taxa e prazo máximo
        const ultimo = creditos[0];
        setTaxaFixada(ultimo.taxaMensal);
        setPrazoMax(ultimo.prazoMeses);
      }
    }).catch(() => {}).finally(() => setLoadingTaxa(false));
  }, []);

  const taxaEfetiva = taxaFixada ?? 0.0099;
  const prazoMaxEfetivo = prazoMax ?? 180;

  const { valorSolicitado, setValorSolicitado, prazoMeses, setPrazoMeses, resultado } =
    useSimuladorCredito(taxaEfetiva);

  if (loadingTaxa) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Simulador de Crédito</Text>

      {/* Taxa pré-fixada */}
      <View style={styles.taxaCard}>
        <Text style={styles.taxaLabel}>Sua taxa pré-fixada</Text>
        <Text style={styles.taxaValue}>{(taxaEfetiva * 100).toFixed(2).replace(".", ",")}% a.m.</Text>
        {taxaFixada !== null && (
          <Text style={styles.taxaHint}>Taxa definida com base na sua última operação</Text>
        )}
      </View>

      {/* Valor */}
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

      {/* Prazo */}
      <View style={styles.sliderBlock}>
        <View style={styles.sliderLabel}>
          <Text style={styles.label}>Prazo</Text>
          <Text style={styles.sliderValue}>{prazoMeses} meses</Text>
        </View>
        <Slider
          minimumValue={12}
          maximumValue={prazoMaxEfetivo}
          step={12}
          value={Math.min(prazoMeses, prazoMaxEfetivo)}
          onValueChange={setPrazoMeses}
          minimumTrackTintColor="#16a34a"
          thumbTintColor="#16a34a"
        />
        {prazoMax !== null && (
          <Text style={styles.prazoHint}>Máximo: {prazoMax} meses (sua última operação)</Text>
        )}
      </View>

      {/* Resultado */}
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
  container: { padding: 20, paddingTop: 56, gap: 20 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  taxaCard: { backgroundColor: "#f0fdf4", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#bbf7d0" },
  taxaLabel: { fontSize: 12, color: "#16a34a", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  taxaValue: { fontSize: 26, fontWeight: "800", color: "#15803d", marginTop: 2 },
  taxaHint: { fontSize: 11, color: "#6b7280", marginTop: 4 },
  sliderBlock: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8 },
  sliderLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  sliderValue: { fontSize: 15, color: "#16a34a", fontWeight: "700" },
  prazoHint: { fontSize: 11, color: "#6b7280", marginTop: 4 },
  resultCard: { backgroundColor: "#16a34a", borderRadius: 20, padding: 20, gap: 4 },
  divider: { height: 1, backgroundColor: "#15803d", marginVertical: 8 },
});
