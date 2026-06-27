import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { kycApi, type KycStatus } from "../../../lib/api";

const DOC_TIPOS = [
  { tipo: "RG_FRENTE", label: "RG — Frente" },
  { tipo: "RG_VERSO", label: "RG — Verso" },
  { tipo: "SELFIE", label: "Selfie c/ documento" },
  { tipo: "COMPROVANTE", label: "Comprovante de residência" },
] as const;

const BADGE: Record<string, { label: string; color: string; bg: string }> = {
  PENDENTE: { label: "Pendente", color: "#b45309", bg: "#fef3c7" },
  EM_VERIFICACAO: { label: "Em análise", color: "#1d4ed8", bg: "#dbeafe" },
  APROVADO: { label: "Aprovado", color: "#15803d", bg: "#dcfce7" },
  REJEITADO: { label: "Rejeitado", color: "#b91c1c", bg: "#fee2e2" },
};

export default function KycScreen() {
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await kycApi.obterStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar KYC");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (tipo: string) => {
    if (tipo === "SELFIE") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permissão necessária", "Permita acesso à câmera para tirar a selfie.");
        return;
      }
      await new Promise<void>((resolve) =>
        Alert.alert(
          "Dicas para a selfie",
          "• Esteja em ambiente bem iluminado\n• Centralize seu rosto na tela\n• Segure o documento ao lado do rosto\n• Evite reflexos e sombras",
          [{ text: "Entendido, continuar", onPress: () => resolve() }],
        ),
      );
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
        cameraType: ImagePicker.CameraType.front,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setUploading(tipo);
      try {
        await kycApi.uploadDocumentoArquivo(tipo, asset.uri, asset.mimeType ?? "image/jpeg");
        await load();
        Alert.alert("Enviado", "Selfie enviada para análise.");
      } catch (e) {
        Alert.alert("Erro", e instanceof Error ? e.message : "Falha no envio");
      } finally {
        setUploading(null);
      }
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissão necessária", "Permita acesso à galeria para enviar documentos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(tipo);
    try {
      await kycApi.uploadDocumentoArquivo(
        tipo,
        asset.uri,
        asset.mimeType ?? "image/jpeg",
      );
      await load();
      Alert.alert("Enviado", "Documento enviado para análise.");
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Falha no envio");
    } finally {
      setUploading(null);
    }
  };

  const docs = status?.documentos ?? [];
  const docMap = Object.fromEntries(docs.map((d) => [d.tipo, d]));
  const aprovados = status?.resumo.aprovados ?? 0;
  const total = status?.resumo.totalTipos ?? DOC_TIPOS.length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Verificação de identidade</Text>
        <Text style={styles.subtitle}>Envie os 4 documentos para liberar seu crédito.</Text>

        {loading && <ActivityIndicator size="large" color="#1B4FD8" style={{ marginTop: 24 }} />}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void load()}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && (
          <>
            <View style={styles.progressCard}>
              <Text style={styles.progressLabel}>
                {aprovados}/{total} aprovados
              </Text>
            </View>

            {DOC_TIPOS.map(({ tipo, label }) => {
              const doc = docMap[tipo];
              const badge = doc ? BADGE[doc.status] ?? BADGE.PENDENTE : null;
              const isUploading = uploading === tipo;
              const canUpload = !doc || doc.status === "REJEITADO";

              return (
                <View key={tipo} style={styles.docRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docLabel}>{label}</Text>
                    {doc?.motivo_rejeicao && (
                      <Text style={styles.rejectReason}>Motivo: {doc.motivo_rejeicao}</Text>
                    )}
                  </View>
                  {badge && (
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  )}
                  {canUpload && (
                    <TouchableOpacity
                      style={[styles.uploadBtn, isUploading && styles.uploadBtnDisabled]}
                      onPress={() => void handleUpload(tipo)}
                      disabled={!!uploading}
                    >
                      {isUploading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.uploadBtnText}>Enviar</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4, marginBottom: 16 },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: { color: "#991b1b", fontSize: 14 },
  retryText: { color: "#1B4FD8", fontWeight: "600", marginTop: 8 },
  progressCard: {
    backgroundColor: "#EEF3FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  progressLabel: { fontSize: 14, fontWeight: "600", color: "#1B4FD8" },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  docLabel: { fontSize: 14, fontWeight: "600", color: "#111827" },
  rejectReason: { fontSize: 12, color: "#b91c1c", marginTop: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  uploadBtn: {
    backgroundColor: "#1B4FD8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: "center",
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
