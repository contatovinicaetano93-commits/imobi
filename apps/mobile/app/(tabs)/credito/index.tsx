import { View, Text, ScrollView, StyleSheet, PanResponder } from "react-native";
import { useSimuladorCredito, formatarBRL, formatarPercentual } from "@imbobi/core";
import { useRef } from "react";

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
        <PureSlider
          minimumValue={10000}
          maximumValue={1000000}
          step={5000}
          value={valorSolicitado}
          onValueChange={setValorSolicitado}
          minimumTrackTintColor="#22C55E"
          thumbTintColor="#22C55E"
        />
      </View>

      {/* Prazo */}
      <View style={styles.sliderBlock}>
        <View style={styles.sliderLabel}>
          <Text style={styles.label}>Prazo</Text>
          <Text style={styles.sliderValue}>{prazoMeses} meses</Text>
        </View>
        <PureSlider
          minimumValue={12}
          maximumValue={180}
          step={12}
          value={prazoMeses}
          onValueChange={setPrazoMeses}
          minimumTrackTintColor="#22C55E"
          thumbTintColor="#22C55E"
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

function PureSlider({
  minimumValue,
  maximumValue,
  step,
  value,
  onValueChange,
  minimumTrackTintColor = "#16a34a",
  thumbTintColor = "#16a34a",
}: {
  minimumValue: number;
  maximumValue: number;
  step: number;
  value: number;
  onValueChange: (v: number) => void;
  minimumTrackTintColor?: string;
  thumbTintColor?: string;
}) {
  const trackWidth = useRef(0);
  const onChangeRef = useRef(onValueChange);
  onChangeRef.current = onValueChange;
  const rangeRef = useRef({ minimumValue, maximumValue, step });
  rangeRef.current = { minimumValue, maximumValue, step };

  const snap = (locationX: number) => {
    const { minimumValue, maximumValue, step } = rangeRef.current;
    const ratio = Math.max(0, Math.min(1, locationX / trackWidth.current));
    const raw = minimumValue + ratio * (maximumValue - minimumValue);
    return Math.max(minimumValue, Math.min(maximumValue, Math.round(raw / step) * step));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => onChangeRef.current(snap(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => onChangeRef.current(snap(e.nativeEvent.locationX)),
    })
  ).current;

  const ratio = (value - minimumValue) / (maximumValue - minimumValue);

  return (
    <View
      style={sliderStyles.track}
      onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
    >
      <View style={sliderStyles.rail}>
        <View style={[sliderStyles.fill, { width: `${ratio * 100}%`, backgroundColor: minimumTrackTintColor }]} />
      </View>
      <View
        style={[
          sliderStyles.thumb,
          { left: `${ratio * 100}%` as any, backgroundColor: thumbTintColor },
        ]}
      />
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

const sliderStyles = StyleSheet.create({
  track: { height: 40, justifyContent: "center" },
  rail: { height: 4, backgroundColor: "#e5e7eb", borderRadius: 2 },
  fill: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 2 },
  thumb: {
    position: "absolute",
    top: 9,
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -11,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 20, paddingTop: 56, gap: 20 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  sliderBlock: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8 },
  sliderLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  sliderValue: { fontSize: 15, color: "#1B4FD8", fontWeight: "700" },
  resultCard: { backgroundColor: "#1B4FD8", borderRadius: 20, padding: 20, gap: 4 },
  divider: { height: 1, backgroundColor: "#1640B0", marginVertical: 8 },
});
