import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { formatarBRL } from "@imbobi/core";
import { obrasApi, type ObraDetalhe } from "../../../../lib/api";

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PLANEJADA:           { bg: "#f3f4f6", text: "#6b7280" },
  EM_EXECUCAO:         { bg: "#dbeafe", text: "#1d4ed8" },
  AGUARDANDO_VISTORIA: { bg: "#fef9c3", text: "#92400e" },
  CONCLUIDA:           { bg: "#dcfce7", text: "#166534" },
  REPROVADA:           { bg: "#fee2e2", text: "#991b1b" },
};

export default function ObraDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [obra, setObra] = useState<ObraDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    obrasApi.buscar(id)
      .then(setObra)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  if (error || !obra) return <View style={styles.center}><Text style={styles.error}>{error ?? "Obra não encontrada"}</Text></View>;

  const credito = obra.credito;
  const saldoDisponivel = credito ? credito.valorAprovado - credito.valorLiberado : 0;
  const concluidas = obra.etapas.filter((e) => e.status === "CONCLUIDA").length;
  const progresso = obra.etapas.length ? Math.round((concluidas / obra.etapas.length) * 100) : 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{obra.nome}</Text>
      <Text style={styles.sub}>{obra.endereco}</Text>

      {credito && (
        <View style={styles.creditoCard}>
          <View style={styles.creditoRow}>
            <Text style={styles.creditoLabel}>Crédito aprovado</Text>
            <Text style={styles.creditoValue}>{formatarBRL(credito.valorAprovado)}</Text>
          </View>
          <View style={styles.creditoRow}>
            <Text style={styles.creditoLabel}>Já liberado</Text>
            <Text style={styles.creditoValue}>{formatarBRL(credito.valorLiberado)}</Text>
          </View>
          <View style={styles.creditoRow}>
            <Text style={styles.creditoLabel}>Disponível</Text>
            <Text style={[styles.creditoValue, { color: "#16a34a" }]}>{formatarBRL(saldoDisponivel)}</Text>
          </View>
        </View>
      )}

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.sectionTitle}>Progresso geral</Text>
          <Text style={styles.progressLabel}>{progresso}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progresso}%` as any }]} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Etapas</Text>
      <View style={styles.etapasList}>
        {obra.etapas.map((etapa) => {
          const colors = STATUS_COLOR[etapa.status] ?? { bg: "#f3f4f6", text: "#6b7280" };
          const podeEnviar = etapa.status === "EM_EXECUCAO" || etapa.status === "PLANEJADA";
          return (
            <View key={etapa.etapaId} style={styles.etapaCard}>
              <View style={styles.etapaHeader}>
                <Text style={styles.etapaNome}>{etapa.ordem}. {etapa.nome}</Text>
                <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.badgeText, { color: colors.text }]}>{etapa.status.replace(/_/g, " ")}</Text>
                </View>
              </View>
              <Text style={styles.etapaValor}>{formatarBRL(etapa.valorLiberacao)}</Text>
              {podeEnviar && (
                <TouchableOpacity
                  style={styles.enviarBtn}
                  onPress={() => router.push({
                    pathname: `/(tabs)/obras/${obra.obraId}/etapa/${etapa.etapaId}`,
                    params: {
                      etapaNome: etapa.nome,
                      geoLat: String(obra.geoLatitude),
                      geoLng: String(obra.geoLongitude),
                      raio: String(obra.raioValidacaoMetros),
                    },
                  })}
                >
                  <Text style={styles.enviarBtnText}>Enviar evidência</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "#dc2626" },
  back: { marginBottom: 16 },
  backText: { color: "#2563eb", fontSize: 15 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 4 },
  sub: { fontSize: 13, color: "#6b7280", marginBottom: 16 },
  creditoCard: { backgroundColor: "#eff6ff", borderRadius: 16, padding: 16, marginBottom: 16 },
  creditoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  creditoLabel: { fontSize: 13, color: "#6b7280" },
  creditoValue: { fontSize: 13, fontWeight: "600", color: "#111827" },
  progressSection: { marginBottom: 20 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 12 },
  progressLabel: { fontSize: 16, fontWeight: "700", color: "#2563eb" },
  progressBar: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#2563eb", borderRadius: 4 },
  etapasList: { gap: 10 },
  etapaCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  etapaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  etapaNome: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: "600" },
  etapaValor: { fontSize: 13, color: "#6b7280", marginBottom: 8 },
  enviarBtn: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  enviarBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
