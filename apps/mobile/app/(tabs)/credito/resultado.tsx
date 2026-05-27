import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { formatarBRL, formatarPercentual } from "@imbobi/core";
import { SolicitacaoCreditoSchema } from "@imbobi/schemas";
import { creditoApi, ApiError } from "../../../lib/api";

interface ParcelaInfo {
  numero: number;
  valor: number;
  data: string;
}

export default function ResultadoSimulacaoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    valorSolicitado: string;
    prazoMeses: string;
    tipoObra: string;
    parcelaMensal: string;
    totalPago: string;
    totalJuros: string;
    cet: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showParcelas, setShowParcelas] = useState(false);

  const valorSolicitado = Number(params.valorSolicitado) || 0;
  const prazoMeses = Number(params.prazoMeses) || 0;
  const parcelaMensal = Number(params.parcelaMensal) || 0;
  const totalPago = Number(params.totalPago) || 0;
  const totalJuros = Number(params.totalJuros) || 0;
  const cet = Number(params.cet) || 0;

  // Generate parcela schedule
  const gerarParcelas = (): ParcelaInfo[] => {
    const parcelas: ParcelaInfo[] = [];
    const hoje = new Date();

    for (let i = 1; i <= prazoMeses; i++) {
      const dataParcela = new Date(hoje);
      dataParcela.setMonth(dataParcela.getMonth() + i);

      parcelas.push({
        numero: i,
        valor: parcelaMensal,
        data: dataParcela.toLocaleDateString("pt-BR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
      });
    }

    return parcelas;
  };

  const parcelas = gerarParcelas();

  const handleSolicitar = useCallback(async () => {
    if (!params.tipoObra) {
      setError("Tipo de obra não informado");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Validate inputs
      const validado = SolicitacaoCreditoSchema.safeParse({
        valorSolicitado,
        prazoMeses,
        tipoObra: params.tipoObra as "RESIDENCIAL" | "COMERCIAL" | "MISTO",
        finalidade: "Simulação de crédito",
        rendaMensalDeclarada: 5000, // Placeholder - should come from user profile
      });

      if (!validado.success) {
        setError(validado.error.errors[0]?.message || "Dados inválidos");
        return;
      }

      // Call API to request credit
      const resultado = await creditoApi.solicitar({
        valorSolicitado,
        prazoMeses,
        tipoObra: params.tipoObra as "RESIDENCIAL" | "COMERCIAL" | "MISTO",
        finalidade: "Simulação de crédito",
        rendaMensalDeclarada: 5000,
      });

      Alert.alert("Sucesso", "Solicitação de crédito enviada! Você será notificado em breve.", [
        {
          text: "OK",
          onPress: () => {
            router.push("/credito");
          },
        },
      ]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : "Erro ao solicitar crédito");
      setError(message);
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }, [valorSolicitado, prazoMeses, params.tipoObra]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Resultado da Simulação</Text>
        <Text style={styles.tipoObra}>{params.tipoObra}</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Principal Info Card */}
      <View style={styles.mainCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Valor solicitado</Text>
          <Text style={styles.infoValue}>{formatarBRL(valorSolicitado)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Prazo</Text>
          <Text style={styles.infoValue}>{prazoMeses} meses</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Parcela mensal</Text>
          <Text style={[styles.infoValue, styles.highlight]}>
            {formatarBRL(parcelaMensal)}
          </Text>
        </View>
      </View>

      {/* Detailed Info */}
      <View style={styles.detailsCard}>
        <DetailRow label="Total pago" value={formatarBRL(totalPago)} />
        <DetailRow label="Total de juros" value={formatarBRL(totalJuros)} />
        <DetailRow label="CET ao ano" value={formatarPercentual(cet)} />
      </View>

      {/* Parcelas Preview */}
      <View style={styles.parcelasSection}>
        <TouchableOpacity
          style={styles.parcelasHeader}
          onPress={() => setShowParcelas(!showParcelas)}
        >
          <Text style={styles.parcelasTitle}>
            Cronograma de pagamento ({prazoMeses} parcelas)
          </Text>
          <Text style={styles.toggleIcon}>{showParcelas ? "▼" : "▶"}</Text>
        </TouchableOpacity>

        {showParcelas && (
          <View style={styles.parcelasContainer}>
            <FlatList
              data={parcelas.slice(0, 6)} // Show first 6, user can scroll for more
              keyExtractor={(item) => String(item.numero)}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View key={item.numero} style={styles.parcelaItem}>
                  <View style={styles.parcelaNumber}>
                    <Text style={styles.parcelaNumberText}>{item.numero}</Text>
                  </View>
                  <View style={styles.parcelaInfo}>
                    <Text style={styles.parcelaDate}>{item.data}</Text>
                    <Text style={styles.parcelaValue}>{formatarBRL(item.valor)}</Text>
                  </View>
                </View>
              )}
            />
            {prazoMeses > 6 && (
              <View style={styles.parcelasMore}>
                <Text style={styles.parcelasMoreText}>
                  +{prazoMeses - 6} parcelas mais
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Info Cards */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Como funciona?</Text>
        <InfoCard
          title="Análise"
          description="Sua solicitação será analisada por nossos especialistas em 24-48 horas."
        />
        <InfoCard
          title="Aprovação"
          description="Você receberá uma notificação com o resultado e as condições finais."
        />
        <InfoCard
          title="Liberação"
          description="Aprovado, o crédito será liberado em até 5 dias úteis para sua conta."
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        onPress={handleSolicitar}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Solicitar Crédito</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.back()}
        disabled={loading}
      >
        <Text style={styles.secondaryButtonText}>Voltar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 }}>
      <Text style={{ color: "#6b7280", fontSize: 13 }}>{label}</Text>
      <Text style={{ color: "#111827", fontSize: 15, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardIcon}>
        <Text style={styles.infoCardIconText}>✓</Text>
      </View>
      <View style={styles.infoCardContent}>
        <Text style={styles.infoCardTitle}>{title}</Text>
        <Text style={styles.infoCardDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 20, paddingBottom: 40, gap: 16 },
  header: { marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 4 },
  tipoObra: {
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "600",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
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
  mainCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  infoLabel: { fontSize: 13, color: "#6b7280" },
  infoValue: { fontSize: 16, fontWeight: "600", color: "#111827" },
  highlight: { color: "#16a34a", fontSize: 18, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#e5e7eb" },
  detailsCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
  },
  parcelasSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  parcelasHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  parcelasTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  toggleIcon: { fontSize: 12, color: "#6b7280" },
  parcelasContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  parcelaItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  parcelaNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  parcelaNumberText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  parcelaInfo: { flex: 1 },
  parcelaDate: { fontSize: 12, color: "#9ca3af", marginBottom: 2 },
  parcelaValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
  parcelasMore: {
    paddingVertical: 8,
    alignItems: "center",
  },
  parcelasMoreText: { fontSize: 12, color: "#9ca3af", fontStyle: "italic" },
  infoSection: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginTop: 8 },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCardIconText: { fontSize: 16, color: "#16a34a", fontWeight: "700" },
  infoCardContent: { flex: 1 },
  infoCardTitle: { fontSize: 13, fontWeight: "600", color: "#111827", marginBottom: 2 },
  infoCardDescription: { fontSize: 12, color: "#6b7280", lineHeight: 16 },
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
