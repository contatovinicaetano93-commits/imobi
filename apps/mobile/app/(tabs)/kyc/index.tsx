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
    setUploading(tipo);
    try {
      const mockUrl = `https://s3.example.com/kyc/${tipo}-${Date.now()}.jpg`;
      await kycApi.uploadDocumento(tipo, mockUrl);
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
              <Text style={styles.retry}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && status && (
          <>
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Progresso</Text>
              <Text style={styles.progressCount}>
                {aprovados}/{total} aprovados
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${Math.round((aprovados / total) * 100)}%` }]}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Documentos obrigatórios</Text>
            {DOC_TIPOS.map(({ tipo, label }) => {
              const doc = docMap[tipo];
              const badge = doc ? BADGE[doc.status] ?? BADGE.PENDENTE : null;
              const isUploading = uploading === tipo;

              return (
                <View key={tipo} style={styles.docRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docLabel}>{label}</Text>
                    {doc && badge && (
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    )}
                  </View>
                  {!doc && (
                    <TouchableOpacity
                      style={styles.sendBtn}
                      onPress={() => void handleUpload(tipo)}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.sendBtnText}>Enviar</Text>
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
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800", color: "#0C1A3D" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 6, marginBottom: 20 },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: "#b91c1c" },
  retry: { color: "#1B4FD8", fontWeight: "600", marginTop: 8 },
  progressCard: {
    backgroundColor: "#EEF3FF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  progressTitle: { fontWeight: "700", color: "#0C1A3D", fontSize: 16 },
  progressCount: { color: "#1B4FD8", fontWeight: "700", marginTop: 4 },
  progressTrack: {
    height: 8,
    backgroundColor: "#fff",
    borderRadius: 999,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#4ADE80", borderRadius: 999 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  docLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  sendBtn: {
    backgroundColor: "#1B4FD8",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 72,
    alignItems: "center",
  },
  sendBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
