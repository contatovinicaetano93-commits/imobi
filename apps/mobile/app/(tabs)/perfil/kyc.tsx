import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { kycApi, type KycDocumento } from "../../../lib/api";

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  PENDENTE:       { label: "Pendente",        color: "#92400e", bg: "#fef3c7" },
  EM_VERIFICACAO: { label: "Em Verificação",  color: "#1d4ed8", bg: "#dbeafe" },
  APROVADO:       { label: "Aprovado",        color: "#166534", bg: "#dcfce7" },
  REJEITADO:      { label: "Rejeitado",       color: "#991b1b", bg: "#fee2e2" },
};

const TIPO_ICONE: Record<string, string> = {
  RG: "card",
  CPF: "document-text",
  CNH: "car",
  Passaporte: "globe",
  "Comprovante de Residência": "home",
  Selfie: "camera",
};

export default function KycScreen() {
  const router = useRouter();
  const [documentos, setDocumentos] = useState<KycDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setError(null);
      const data = await kycApi.documentos();
      setDocumentos(data);
    } catch {
      setError("Não foi possível carregar os documentos KYC.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const aprovados = documentos.filter((d) => d.status === "APROVADO").length;
  const total = documentos.length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Verificação KYC</Text>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={carregar}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Ionicons name="shield-checkmark" size={24} color="#16a34a" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.summaryTitle}>Documentos enviados</Text>
                <Text style={styles.summaryValue}>{aprovados} de {total} aprovados</Text>
              </View>
            </View>
            {total > 0 && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${total > 0 ? (aprovados / total) * 100 : 0}%` as any }]} />
              </View>
            )}
          </View>

          {documentos.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>Nenhum documento enviado</Text>
              <Text style={styles.emptyText}>
                Envie seus documentos pelo portal web para completar a verificação.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {documentos.map((doc) => {
                const status = STATUS_LABEL[doc.status] ?? STATUS_LABEL.PENDENTE;
                const iconName = (TIPO_ICONE[doc.tipo] ?? "document") as any;
                return (
                  <View key={doc.kycDocumentoId} style={styles.docCard}>
                    <View style={styles.docIcon}>
                      <Ionicons name={iconName} size={22} color="#374151" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docTipo}>{doc.tipo}</Text>
                      <Text style={styles.docData}>
                        Enviado em {new Date(doc.criadoEm).toLocaleDateString("pt-BR")}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
            <Text style={styles.infoText}>
              Para enviar novos documentos ou atualizar o status KYC, acesse o portal web.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 52, paddingBottom: 20 },
  back: { padding: 4 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  summary: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  summaryRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  summaryTitle: { fontSize: 14, color: "#6b7280" },
  summaryValue: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 2 },
  progressBar: { height: 6, backgroundColor: "#f3f4f6", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: "#16a34a", borderRadius: 3 },
  list: { gap: 10 },
  docCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  docIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  docTipo: { fontSize: 15, fontWeight: "600", color: "#111827" },
  docData: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 13, color: "#9ca3af", textAlign: "center", lineHeight: 18, maxWidth: 260 },
  infoBox: { flexDirection: "row", gap: 10, backgroundColor: "#f3f4f6", borderRadius: 12, padding: 14, marginTop: 20, alignItems: "flex-start" },
  infoText: { fontSize: 13, color: "#6b7280", flex: 1, lineHeight: 18 },
  errorText: { fontSize: 15, color: "#ef4444", textAlign: "center", marginBottom: 16 },
  retryBtn: { backgroundColor: "#16a34a", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: "#fff", fontWeight: "600" },
});
