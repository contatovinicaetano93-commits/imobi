import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { kycApi, type KycDocumento, ApiError } from "@/lib/api";

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDENTE: { bg: "#fef3c7", text: "#92400e", label: "Pendente de análise" },
  APROVADO: { bg: "#dcfce7", text: "#166534", label: "Aprovado" },
  REJEITADO: { bg: "#fee2e2", text: "#991b1b", label: "Rejeitado" },
};

export default function KycListScreen() {
  const router = useRouter();
  const [documentos, setDocumentos] = useState<KycDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarDocumentos = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const docs = await kycApi.listarDocumentos();
      setDocumentos(docs);
      setError(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao carregar documentos";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarDocumentos();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    carregarDocumentos(true);
  };

  const handleUpload = (doc: KycDocumento) => {
    router.push({
      pathname: "/kyc/[id]/upload",
      params: { id: doc.kycDocumentoId, tipo: doc.tipo },
    });
  };

  const renderDocumento = ({ item }: { item: KycDocumento }) => {
    const statusInfo = STATUS_COLORS[item.status];

    return (
      <TouchableOpacity
        style={styles.documentoCard}
        onPress={() => router.push({
          pathname: "/kyc/[id]/preview",
          params: { id: item.kycDocumentoId },
        })}
      >
        <View style={styles.documentoHeader}>
          <Text style={styles.documentoTipo}>{item.tipo}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.text }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {item.status === "REJEITADO" && item.motivo_rejeicao && (
          <View style={styles.rejeitadoMotivo}>
            <Text style={styles.rejeitadoLabel}>Motivo da rejeição:</Text>
            <Text style={styles.rejeitadoMotivoText}>{item.motivo_rejeicao}</Text>
          </View>
        )}

        <Text style={styles.dataSubmissao}>
          Enviado em {new Date(item.criadoEm).toLocaleDateString("pt-BR")}
        </Text>

        {item.status === "REJEITADO" && (
          <TouchableOpacity
            style={styles.botaoReenviar}
            onPress={() => handleUpload(item)}
          >
            <Text style={styles.botaoReenviarText}>Reenviar Documento</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.title}>Documentos KYC</Text>
        <Text style={styles.subtitle}>
          Envie seus documentos de identificação para completar sua conta
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {documentos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum documento enviado</Text>
            <Text style={styles.emptySubtext}>
              Comece enviando seu documento de identificação
            </Text>
          </View>
        ) : (
          <FlatList
            data={documentos}
            renderItem={renderDocumento}
            keyExtractor={(item) => item.kycDocumentoId}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.botaoPrimario}
        onPress={() => router.push("/kyc/novo")}
      >
        <Text style={styles.botaoPrimarioText}>Enviar Novo Documento</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    paddingBottom: 80,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  errorContainer: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  documentoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  documentoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  documentoTipo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dataSubmissao: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 12,
  },
  rejeitadoMotivo: {
    backgroundColor: "#fef9c3",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ca8a04",
  },
  rejeitadoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 4,
  },
  rejeitadoMotivoText: {
    fontSize: 13,
    color: "#78350f",
    lineHeight: 20,
  },
  botaoReenviar: {
    backgroundColor: "#fbbf24",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  botaoReenviarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#78350f",
  },
  botaoPrimario: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  botaoPrimarioText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
