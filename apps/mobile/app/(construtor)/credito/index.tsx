import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSimuladorCredito } from "@imbobi/core/hooks";
import { formatarBRL, formatarPercentual } from "@imbobi/core";
import { useState } from "react";
import Slider from "@react-native-community/slider";

export default function CreditoScreen() {
  const { valorSolicitado, setValorSolicitado, prazoMeses, setPrazoMeses, resultado } =
    useSimuladorCredito();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Simulador de Crédito</Text>

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
          maximumValue={180}
          step={12}
          value={prazoMeses}
          onValueChange={setPrazoMeses}
          minimumTrackTintColor="#16a34a"
          thumbTintColor="#16a34a"
        />
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
  sliderBlock: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8 },
  sliderLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  sliderValue: { fontSize: 15, color: "#16a34a", fontWeight: "700" },
  resultCard: { backgroundColor: "#16a34a", borderRadius: 20, padding: 20, gap: 4 },
  divider: { height: 1, backgroundColor: "#15803d", marginVertical: 8 },
});
