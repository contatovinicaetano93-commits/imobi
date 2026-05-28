import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  FlatList,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { formatarBRL } from "@imbobi/core";
import { evidenciasApi, obrasApi, type ObraDetalhe, type Evidencia } from "../../../../lib/api";

export default function EvidenciasListScreen() {
  const router = useRouter();
  const { obraId } = useLocalSearchParams<{ obraId: string }>();

  const [obra, setObra] = useState<ObraDetalhe | null>(null);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!obraId) return;

    try {
      setError(null);
      const [obraData, evidenciasData] = await Promise.all([
        obrasApi.buscar(obraId),
        evidenciasApi.listar(obraId),
      ]);

      setObra(obraData);
      setEvidencias(evidenciasData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar dados";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [obraId]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload when screen is focused
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCapture = () => {
    if (!obra) return;
    router.push({
      pathname: "/(authenticated)/evidencias/[obraId]/capture",
      params: { obraId },
    });
  };

  const handleSelectEtapa = (etapaId: string) => {
    if (!obraId) return;
    router.push({
      pathname: "/(authenticated)/evidencias/[obraId]/upload",
      params: { obraId, etapaId },
    });
  };

  if (loading && !obra) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (error || !obra) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Obra não encontrada"}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pendingEtapas = obra.etapas.filter(
    (e) => e.status === "EM_EXECUCAO" || e.status === "PENDENTE"
  );

  const validadosCount = evidencias.filter((e) => e.validada).length;
  const pendentesCount = evidencias.length - validadosCount;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Evidências</Text>
          <Text style={styles.subtitle}>{obra.nome}</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{evidencias.length}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardSuccess]}>
            <Text style={styles.statLabel}>Aprovadas</Text>
            <Text style={styles.statValue}>{validadosCount}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardWarning]}>
            <Text style={styles.statLabel}>Pendentes</Text>
            <Text style={styles.statValue}>{pendentesCount}</Text>
          </View>
        </View>

        {/* Capture Options */}
        {pendingEtapas.length > 0 && (
          <View style={styles.captureSection}>
            <Text style={styles.sectionTitle}>Capturar Evidência</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCapture}
            >
              <Text style={styles.primaryButtonIcon}>📷</Text>
              <Text style={styles.primaryButtonText}>
                Tirar Foto com GPS (Recomendado)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                if (pendingEtapas.length === 1) {
                  handleSelectEtapa(pendingEtapas[0].etapaId);
                } else {
                  // Show etapa selection
                  Alert.alert("Selecione uma etapa", "", [
                    ...pendingEtapas.map((e) => ({
                      text: e.nome,
                      onPress: () => handleSelectEtapa(e.etapaId),
                    })),
                    { text: "Cancelar", style: "cancel" },
                  ]);
                }
              }}
            >
              <Text style={styles.secondaryButtonIcon}>📁</Text>
              <Text style={styles.secondaryButtonText}>Usar da Galeria</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Evidências List */}
        {evidencias.length > 0 ? (
          <View style={styles.evidenciasSection}>
            <Text style={styles.sectionTitle}>Evidências Capturadas</Text>
            <FlatList
              scrollEnabled={false}
              data={evidencias}
              keyExtractor={(item) => item.evidenciaId}
              renderItem={({ item }) => (
                <EvidenciaCard evidencia={item} />
              )}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📸</Text>
            <Text style={styles.emptyStateTitle}>Nenhuma evidência</Text>
            <Text style={styles.emptyStateText}>
              Capture fotos da obra para comprovar o progresso das etapas
            </Text>
          </View>
        )}

        {/* Etapas Info */}
        {pendingEtapas.length > 0 && (
          <View style={styles.etapasSection}>
            <Text style={styles.sectionTitle}>Etapas em Progresso</Text>
            {pendingEtapas.map((etapa) => (
              <View key={etapa.etapaId} style={styles.etapaCard}>
                <View style={styles.etapaHeader}>
                  <Text style={styles.etapaNome}>
                    {etapa.ordem}. {etapa.nome}
                  </Text>
                  <Text style={styles.etapaPercentual}>{etapa.percentualObra}%</Text>
                </View>
                <Text style={styles.etapaValor}>
                  Liberação: {formatarBRL(etapa.valorLiberacao)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function EvidenciaCard({ evidencia }: { evidencia: Evidencia }) {
  const [imageLoading, setImageLoading] = useState(true);

  const formattedDate = new Date(evidencia.criadoEm).toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const statusColor = evidencia.validada ? "#16a34a" : "#f59e0b";
  const statusLabel = evidencia.validada ? "Aprovada" : "Pendente";

  return (
    <View style={styles.evidenciaCard}>
      <View style={styles.evidenciaImageContainer}>
        {imageLoading && (
          <View style={styles.imagePlaceholder}>
            <ActivityIndicator size="small" color="#d1d5db" />
          </View>
        )}
        <Image
          source={{ uri: evidencia.fotoUrl }}
          style={styles.evidenciaImage}
          onLoadEnd={() => setImageLoading(false)}
          onLoad={() => setImageLoading(false)}
        />
      </View>
      <View style={styles.evidenciaContent}>
        <View style={styles.evidenciaHeader}>
          <Text style={styles.evidenciaDate}>{formattedDate}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}20` },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backText: {
    color: "#16a34a",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  statCardPrimary: {
    backgroundColor: "#dbeafe",
  },
  statCardSuccess: {
    backgroundColor: "#dcfce7",
  },
  statCardWarning: {
    backgroundColor: "#fef3c7",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  captureSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 12,
    flexDirection: "row",
  },
  primaryButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    textAlign: "left",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
  },
  secondaryButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    textAlign: "left",
  },
  evidenciasSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  evidenciaCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  evidenciaImageContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#f3f4f6",
    position: "relative",
  },
  imagePlaceholder: {
    position: "absolute",
    zIndex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  evidenciaImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  evidenciaContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  evidenciaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  evidenciaDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyStateIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },
  etapasSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  etapaCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
  },
  etapaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  etapaNome: {
    fontSize: 13,
    fontWeight: "700",
    color: "#047857",
    flex: 1,
  },
  etapaPercentual: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
  },
  etapaValor: {
    fontSize: 12,
    color: "#6b7280",
  },
  errorText: {
    color: "#991b1b",
    fontSize: 16,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#16a34a",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
