import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSimuladorCredito } from "@imbobi/core/src/hooks/useSimuladorCredito";
import { formatarBRL, formatarPercentual } from "@imbobi/core";
import { SimulacaoCreditoSchema } from "@imbobi/schemas";
import { simuladorApi, ApiError } from "../../../../lib/api";
import { haptics } from "../../../../lib/haptics";
import Slider from "@react-native-community/slider";

const TIPO_OBRA_OPTIONS = ["RESIDENCIAL", "COMERCIAL", "MISTO"] as const;

export default function SimularCreditoScreen() {
  const router = useRouter();
  const { valorSolicitado, setValorSolicitado, prazoMeses, setPrazoMeses, resultado } =
    useSimuladorCredito();

  const [tipoObra, setTipoObra] = useState<"RESIDENCIAL" | "COMERCIAL" | "MISTO">("RESIDENCIAL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimular = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await haptics.impact();

      // Validate inputs with Zod schema
      const validado = SimulacaoCreditoSchema.safeParse({
        valorSolicitado,
        prazoMeses: Math.round(prazoMeses),
        tipoObra,
      });

      if (!validado.success) {
        const errorMsg = validado.error.errors[0]?.message || "Dados inválidos";
        setError(errorMsg);
        await haptics.error();
        return;
      }

      // Call API to simulate
      const resultado = await simuladorApi.simular({
        valorSolicitado,
        prazoMeses: Math.round(prazoMeses),
        tipoObra,
      });

      await haptics.success();
      // Navigate to resultado with data
      router.push({
        pathname: "/credito/resultado",
        params: {
          valorSolicitado: String(valorSolicitado),
          prazoMeses: String(Math.round(prazoMeses)),
          tipoObra,
          parcelaMensal: String(resultado.parcelaMensal),
          totalPago: String(resultado.totalPago),
          totalJuros: String(resultado.totalJuros),
          cet: String(resultado.cet),
        },
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : "Erro ao simular crédito");
      setError(message);
      await haptics.error();
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }, [valorSolicitado, prazoMeses, tipoObra]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Simulador de Crédito</Text>
      <Text style={styles.subtitle}>Descubra quanto você pode pedir emprestado</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Valor */}
      <View style={styles.formSection}>
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
            onValueChange={(val) => {
              setValorSolicitado(val);
              haptics.selection();
            }}
            minimumTrackTintColor="#16a34a"
            thumbTintColor="#16a34a"
            accessible={true}
            accessibilityLabel="Valor desejado"
            accessibilityHint={`Deslize para ajustar o valor: ${formatarBRL(valorSolicitado)}`}
          />
          <View style={styles.sliderRange}>
            <Text style={styles.rangeText}>R$ 10.000</Text>
            <Text style={styles.rangeText}>R$ 1.000.000</Text>
          </View>
        </View>

        {/* Prazo */}
        <View style={styles.sliderBlock}>
          <View style={styles.sliderLabel}>
            <Text style={styles.label}>Prazo (meses)</Text>
            <Text style={styles.sliderValue}>{Math.round(prazoMeses)} meses</Text>
          </View>
          <Slider
            minimumValue={12}
            maximumValue={180}
            step={12}
            value={prazoMeses}
            onValueChange={(val) => {
              setPrazoMeses(val);
              haptics.selection();
            }}
            minimumTrackTintColor="#16a34a"
            thumbTintColor="#16a34a"
            accessible={true}
            accessibilityLabel="Prazo em meses"
            accessibilityHint={`Deslize para ajustar o prazo: ${Math.round(prazoMeses)} meses`}
          />
          <View style={styles.sliderRange}>
            <Text style={styles.rangeText}>12 meses</Text>
            <Text style={styles.rangeText}>180 meses</Text>
          </View>
        </View>

        {/* Tipo de Obra */}
        <View style={styles.formField}>
          <Text style={styles.label}>Tipo de obra</Text>
          <View style={styles.buttonGroup}>
            {TIPO_OBRA_OPTIONS.map((tipo) => (
              <TouchableOpacity
                key={tipo}
                style={[
                  styles.buttonOption,
                  tipoObra === tipo && styles.buttonOptionActive,
                ]}
                onPress={() => {
                  setTipoObra(tipo);
                  haptics.selection();
                }}
                accessibilityLabel={`Tipo de obra: ${tipo}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: tipoObra === tipo }}
                accessibilityHint={`Toca para selecionar ${tipo}`}
              >
                <Text
                  style={[
                    styles.buttonOptionText,
                    tipoObra === tipo && styles.buttonOptionTextActive,
                  ]}
                >
                  {tipo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Preview do Resultado */}
      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>Simulação</Text>
        <ResultRow label="Parcela mensal" value={formatarBRL(resultado.parcelaMensal)} big />
        <View style={styles.divider} />
        <ResultRow label="Total pago" value={formatarBRL(resultado.totalPago)} />
        <ResultRow label="Total de juros" value={formatarBRL(resultado.totalJuros)} />
        <ResultRow label="CET ao ano" value={formatarPercentual(resultado.cet)} />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        onPress={handleSimular}
        disabled={loading}
        accessibilityLabel="Simular Crédito"
        accessibilityRole="button"
        accessibilityHint="Toca para simular o crédito com os valores definidos"
        accessibilityState={{ disabled: loading }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Simular Crédito</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          haptics.tap();
          router.back();
        }}
        disabled={loading}
        accessibilityLabel="Voltar"
        accessibilityRole="button"
        accessibilityHint="Toca para voltar à tela anterior"
        accessibilityState={{ disabled: loading }}
      >
        <Text style={styles.secondaryButtonText}>Voltar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ResultRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 }}>
      <Text style={{ color: "#dcfce7", fontSize: big ? 14 : 13 }}>{label}</Text>
      <Text style={{ color: "#fff", fontSize: big ? 24 : 16, fontWeight: big ? "800" : "600" }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 20, paddingBottom: 40, gap: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 16 },
  errorContainer: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
  },
  formSection: { gap: 16 },
  sliderBlock: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sliderLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  label: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  sliderValue: { fontSize: 16, color: "#16a34a", fontWeight: "700" },
  sliderRange: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  rangeText: { fontSize: 11, color: "#9ca3af" },
  formField: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  buttonOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  buttonOptionActive: {
    backgroundColor: "#16a34a",
    borderColor: "#15803d",
  },
  buttonOptionText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  buttonOptionTextActive: {
    color: "#fff",
  },
  resultCard: {
    backgroundColor: "#16a34a",
    borderRadius: 16,
    padding: 20,
    gap: 2,
    marginTop: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dcfce7",
    marginBottom: 12,
  },
  divider: { height: 1, backgroundColor: "#15803d", marginVertical: 10 },
  primaryButton: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
});
