import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Image, Alert, RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { obrasApi, evidenciasApi, type ObraDetalhe, type Etapa, type Evidencia, type EvidenciaDetalhada } from "../../../../lib/api";

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PLANEJADA:           { bg: "#f3f4f6", text: "#6b7280" },
  EM_EXECUCAO:         { bg: "#dbeafe", text: "#1d4ed8" },
  AGUARDANDO_VISTORIA: { bg: "#fef9c3", text: "#92400e" },
  CONCLUIDA:           { bg: "#dcfce7", text: "#166534" },
  REPROVADA:           { bg: "#fee2e2", text: "#991b1b" },
};

function EvidenciaCard({ ev, onValidar }: { ev: EvidenciaDetalhada; onValidar: (id: string, aprovado: boolean) => void }) {
  return (
    <View style={s.evCard}>
      <Image source={{ uri: ev.fotoUrl }} style={s.evFoto} resizeMode="cover" />
      <View style={s.evInfo}>
        <Text style={s.evData}>{new Date(ev.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
        <Text style={s.evAcc}>GPS ±{Math.round(ev.accuracyMetros)}m · {Math.round(ev.distanciaObra)}m da obra</Text>
        {ev.validada ? (
          <View style={s.evValidadaTag}>
            <Ionicons name="checkmark-circle" size={14} color="#166534" />
            <Text style={s.evValidadaText}>Aprovada</Text>
          </View>
        ) : (
          <View style={s.evAcoes}>
            <TouchableOpacity style={s.btnAprovar} onPress={() => onValidar(ev.evidenciaId, true)}>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={s.btnAprovarText}>Aprovar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnRejeitar} onPress={() => onValidar(ev.evidenciaId, false)}>
              <Ionicons name="close" size={14} color="#dc2626" />
              <Text style={s.btnRejeitarText}>Rejeitar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ObraEngenheiroDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [obra, setObra] = useState<ObraDetalhe | null>(null);
  const [evidencias, setEvidencias] = useState<Record<string, EvidenciaDetalhada[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const data = await obrasApi.buscar(id);
      setObra(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar obra");
    }
  }, [id]);

  useEffect(() => { carregar().finally(() => setLoading(false)); }, [carregar]);

  const onRefresh = async () => { setRefreshing(true); await carregar(); setRefreshing(false); };

  const carregarEvidencias = useCallback(async (etapaId: string) => {
    if (evidencias[etapaId]) return;
    try {
      const evs = await evidenciasApi.listarPorEtapa(etapaId);
      setEvidencias((prev) => ({ ...prev, [etapaId]: evs }));
    } catch {
      setEvidencias((prev) => ({ ...prev, [etapaId]: [] }));
    }
  }, [evidencias]);

  const toggleEtapa = (etapaId: string) => {
    const next = expanded === etapaId ? null : etapaId;
    setExpanded(next);
    if (next) carregarEvidencias(next);
  };

  const handleValidar = (evidenciaId: string, aprovado: boolean) => {
    Alert.alert(
      aprovado ? "Aprovar evidência" : "Rejeitar evidência",
      aprovado ? "Confirmar aprovação desta foto?" : "Confirmar rejeição desta foto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: aprovado ? "Aprovar" : "Rejeitar",
          style: aprovado ? "default" : "destructive",
          onPress: async () => {
            try {
              await evidenciasApi.validar(evidenciaId, aprovado);
              setEvidencias((prev) => {
                const updated: Record<string, EvidenciaDetalhada[]> = {};
                for (const etapaId of Object.keys(prev)) {
                  updated[etapaId] = prev[etapaId].map((e) =>
                    e.evidenciaId === evidenciaId ? { ...e, validada: aprovado } : e
                  );
                }
                return updated;
              });
            } catch (e: any) {
              Alert.alert("Erro", e.message ?? "Falha ao validar.");
            }
          },
        },
      ]
    );
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#d97706" /></View>;

  if (error || !obra) {
    return <View style={s.center}><Text style={s.error}>{error ?? "Obra não encontrada."}</Text></View>;
  }

  const concluidas = obra.etapas.filter((e) => e.status === "CONCLUIDA").length;
  const progresso = obra.etapas.length ? Math.round((concluidas / obra.etapas.length) * 100) : 0;

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />}
    >
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Ionicons name="arrow-back" size={22} color="#111827" />
        <Text style={s.backText}>Obras</Text>
      </TouchableOpacity>

      <Text style={s.title}>{obra.nome}</Text>
      <Text style={s.endereco}>{obra.endereco}</Text>

      <View style={s.progressRow}>
        <View style={s.bar}>
          <View style={[s.barFill, { width: `${progresso}%` as any }]} />
        </View>
        <Text style={s.progressPct}>{progresso}%</Text>
      </View>

      <Text style={s.sectionLabel}>Etapas ({obra.etapas.length})</Text>

      {(obra.etapas as (Etapa & { evidencias: Evidencia[] })[]).map((etapa) => {
        const colors = STATUS_COLOR[etapa.status] ?? { bg: "#f3f4f6", text: "#6b7280" };
        const isExpanded = expanded === etapa.etapaId;
        const evs = evidencias[etapa.etapaId];
        const pendentes = etapa.evidencias?.filter((e: Evidencia) => !e.validada).length ?? 0;

        return (
          <View key={etapa.etapaId} style={s.etapaCard}>
            <TouchableOpacity style={s.etapaHeader} onPress={() => toggleEtapa(etapa.etapaId)}>
              <View style={s.etapaLeft}>
                <Text style={s.etapaNome}>{etapa.ordem}. {etapa.nome}</Text>
                {pendentes > 0 && (
                  <View style={s.badgePendente}>
                    <Text style={s.badgePendenteText}>{pendentes} pendente{pendentes > 1 ? "s" : ""}</Text>
                  </View>
                )}
              </View>
              <View style={s.etapaRight}>
                <View style={[s.statusTag, { backgroundColor: colors.bg }]}>
                  <Text style={[s.statusText, { color: colors.text }]}>{etapa.status.replace(/_/g, " ")}</Text>
                </View>
                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={s.evSection}>
                {evs === undefined ? (
                  <ActivityIndicator color="#d97706" style={{ marginVertical: 12 }} />
                ) : evs.length === 0 ? (
                  <Text style={s.semEv}>Nenhuma evidência enviada.</Text>
                ) : (
                  evs.map((ev) => (
                    <EvidenciaCard key={ev.evidenciaId} ev={ev} onValidar={handleValidar} />
                  ))
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, gap: 12, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  back: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  backText: { fontSize: 15, color: "#374151", fontWeight: "500" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  endereco: { fontSize: 13, color: "#6b7280" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bar: { flex: 1, height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#d97706", borderRadius: 3 },
  progressPct: { fontSize: 13, fontWeight: "700", color: "#d97706", width: 36, textAlign: "right" },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  etapaCard: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  etapaHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  etapaLeft: { flex: 1, gap: 4 },
  etapaNome: { fontSize: 14, fontWeight: "600", color: "#111827" },
  badgePendente: { backgroundColor: "#fef3c7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: "flex-start" },
  badgePendenteText: { fontSize: 11, fontWeight: "600", color: "#92400e" },
  etapaRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "600" },
  evSection: { borderTopWidth: 1, borderTopColor: "#f3f4f6", padding: 12, gap: 10 },
  semEv: { fontSize: 13, color: "#9ca3af", textAlign: "center", paddingVertical: 8 },
  evCard: { flexDirection: "row", gap: 12, backgroundColor: "#f9fafb", borderRadius: 12, overflow: "hidden" },
  evFoto: { width: 90, height: 90 },
  evInfo: { flex: 1, padding: 10, gap: 4, justifyContent: "center" },
  evData: { fontSize: 12, fontWeight: "600", color: "#374151" },
  evAcc: { fontSize: 11, color: "#9ca3af" },
  evValidadaTag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  evValidadaText: { fontSize: 12, color: "#166534", fontWeight: "600" },
  evAcoes: { flexDirection: "row", gap: 8, marginTop: 4 },
  btnAprovar: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#16a34a", borderRadius: 8, paddingVertical: 6 },
  btnAprovarText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  btnRejeitar: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#fee2e2", borderRadius: 8, paddingVertical: 6 },
  btnRejeitarText: { color: "#dc2626", fontSize: 12, fontWeight: "600" },
});
