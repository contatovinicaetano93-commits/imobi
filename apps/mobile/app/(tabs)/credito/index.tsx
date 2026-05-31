import { View, Text, ScrollView, StyleSheet, ActivityIndicator, useWindowDimensions } from "react-native";
import { useSimuladorCredito, formatarBRL, formatarPercentual } from "@imbobi/core";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "@imbobi/core";

type UserProfile = {
  usuarioId: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  tipo: string;
  kycStatus: string;
  saldo_credito?: number;
  criadoEm: string;
};

export default function CreditoScreen() {
  const { valorSolicitado, setValorSolicitado, prazoMeses, setPrazoMeses, resultado } =
    useSimuladorCredito();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (token) {
        const data = await apiClient.get<UserProfile>("/api/v1/usuarios/me", token);
        setUser(data);
      }
    } catch (e: any) {
      console.error("Erro ao carregar perfil:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Crédito Disponível</Text>

      {/* Credit Available Card */}
      {user && user.saldo_credito !== undefined && (
        <View style={styles.creditAvailableCard}>
          <View style={styles.creditAvailableContent}>
            <Text style={styles.creditAvailableLabel}>Seu Limite de Crédito</Text>
            <Text style={styles.creditAvailableValue}>
              {formatarBRL(user.saldo_credito)}
            </Text>
            <Text style={styles.creditAvailableSubtext}>
              Disponível para empréstimos
            </Text>
          </View>
          <View style={styles.creditAvailableIcon}>
            <Ionicons name="wallet" size={40} color="#fff" />
          </View>
        </View>
      )}

      <Text style={styles.simuladorTitle}>Simulador de Crédito</Text>

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
  container: { padding: 20, paddingTop: 56, gap: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 4 },
  creditAvailableCard: {
    backgroundColor: "#16a34a",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  creditAvailableContent: { flex: 1 },
  creditAvailableLabel: { fontSize: 14, color: "#dcfce7", fontWeight: "500", marginBottom: 8 },
  creditAvailableValue: { fontSize: 28, fontWeight: "700", color: "#fff", marginBottom: 4 },
  creditAvailableSubtext: { fontSize: 12, color: "#dcfce7" },
  creditAvailableIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  simuladorTitle: { fontSize: 18, fontWeight: "600", color: "#111827", marginTop: 8, marginBottom: 12 },
  sliderBlock: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8 },
  sliderLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  sliderValue: { fontSize: 15, color: "#16a34a", fontWeight: "700" },
  resultCard: { backgroundColor: "#16a34a", borderRadius: 20, padding: 20, gap: 4 },
  divider: { height: 1, backgroundColor: "#15803d", marginVertical: 8 },
});
