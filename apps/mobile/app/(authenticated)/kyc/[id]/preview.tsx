import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { kycApi, type KycDocumento, ApiError } from "@/lib/api";

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDENTE: { bg: "#fef3c7", text: "#92400e", label: "Pendente de análise" },
  APROVADO: { bg: "#dcfce7", text: "#166534", label: "Aprovado" },
  REJEITADO: { bg: "#fee2e2", text: "#991b1b", label: "Rejeitado" },
};

const KYC_TIPOS_LABELS: Record<string, string> = {
  RG: "Documento de Identidade (RG)",
  CPF: "CPF",
  CARTEIRA_MOTORISTA: "Carteira de Motorista",
  PASSPORT: "Passaporte",
  COMPROVANTE_ENDERECO: "Comprovante de Endereço",
};

export default function PreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [documento, setDocumento] = useState<KycDocumento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarDocumento = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all documents and find the one we need
      const docs = await kycApi.listarDocumentos();
      const doc = docs.find((d) => d.kycDocumentoId === id);
      if (!doc) {
        setError("Documento não encontrado");
        return;
      }
      setDocumento(doc);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao carregar documento";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDocumento();
  }, [id]);

  const handleReupload = () => {
    if (documento) {
      router.push({
        pathname: "/kyc/[id]/upload",
        params: { id: documento.kycDocumentoId, tipo: documento.tipo },
      });
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (error || !documento) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || "Documento não encontrado"}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const statusInfo = STATUS_COLORS[documento.status];
  const isImage = documento.url && !documento.url.includes(".pdf");
  const isPdf = documento.url && documento.url.includes(".pdf");

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{KYC_TIPOS_LABELS[documento.tipo] || documento.tipo}</Text>

        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.text }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Document Preview */}
        <View style={styles.previewSection}>
          {isImage && (
            <Image
              source={{ uri: documento.url }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}

          {isPdf && (
            <View style={styles.pdfPlaceholder}>
              <Text style={styles.pdfIcon}>📄</Text>
              <Text style={styles.pdfText}>PDF Document</Text>
              <TouchableOpacity
                style={styles.openPdfButton}
                onPress={() => {
                  Alert.alert("Abrir PDF", "Para visualizar o PDF completo, abra o link no navegador");
                }}
              >
                <Text style={styles.openPdfButtonText}>Abrir no Navegador</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isImage && !isPdf && (
            <View style={styles.noPreviewContainer}>
              <Text style={styles.noPreviewText}>Preview não disponível</Text>
            </View>
          )}
        </View>

        {/* Document Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipo de Documento:</Text>
            <Text style={styles.infoValue}>{documento.tipo}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={[styles.infoValue, { color: statusInfo.text }]}>
              {statusInfo.label}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Enviado em:</Text>
            <Text style={styles.infoValue}>
              {new Date(documento.criadoEm).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>

          {documento.analisadoEm && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Analisado em:</Text>
                <Text style={styles.infoValue}>
                  {new Date(documento.analisadoEm).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Rejection Reason */}
        {documento.status === "REJEITADO" && documento.motivo_rejeicao && (
          <View style={styles.rejeitadoContainer}>
            <Text style={styles.rejeitadoTitle}>Motivo da Rejeição</Text>
            <Text style={styles.rejeitadoText}>{documento.motivo_rejeicao}</Text>
          </View>
        )}

        {/* Approval Message */}
        {documento.status === "APROVADO" && (
          <View style={styles.aprovadoContainer}>
            <Text style={styles.aprovadoIcon}>✓</Text>
            <Text style={styles.aprovadoTitle}>Documento Aprovado</Text>
            <Text style={styles.aprovadoText}>
              Seus documentos foram validados com sucesso
            </Text>
          </View>
        )}

        {/* Pending Message */}
        {documento.status === "PENDENTE" && (
          <View style={styles.pendingContainer}>
            <Text style={styles.pendingIcon}>⏳</Text>
            <Text style={styles.pendingTitle}>Análise em Progresso</Text>
            <Text style={styles.pendingText}>
              Seu documento está sendo analisado. Você será notificado em breve.
            </Text>
          </View>
        )}
      </ScrollView>

      {documento.status === "REJEITADO" && (
        <TouchableOpacity style={styles.primaryButton} onPress={handleReupload}>
          <Text style={styles.primaryButtonText}>Reenviar Documento</Text>
        </TouchableOpacity>
      )}

      {documento.status !== "REJEITADO" && (
        <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
          <Text style={styles.secondaryButtonText}>Fechar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statusContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  previewSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  previewImage: {
    width: "100%",
    height: 400,
  },
  pdfPlaceholder: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  pdfText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 20,
  },
  openPdfButton: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  openPdfButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  noPreviewContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  noPreviewText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  rejeitadoContainer: {
    backgroundColor: "#fee2e2",
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
  },
  rejeitadoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: 8,
  },
  rejeitadoText: {
    fontSize: 13,
    color: "#7f1d1d",
    lineHeight: 20,
  },
  aprovadoContainer: {
    backgroundColor: "#dcfce7",
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#15803d",
  },
  aprovadoIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  aprovadoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 4,
  },
  aprovadoText: {
    fontSize: 13,
    color: "#166534",
    textAlign: "center",
  },
  pendingContainer: {
    backgroundColor: "#fef9c3",
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#ca8a04",
  },
  pendingIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 4,
  },
  pendingText: {
    fontSize: 13,
    color: "#92400e",
    textAlign: "center",
  },
  primaryButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  errorContainer: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
  },
});
