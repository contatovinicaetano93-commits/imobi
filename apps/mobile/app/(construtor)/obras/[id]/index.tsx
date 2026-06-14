import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatarBRL } from "../../../../lib/api";
import { obrasApi, type ObraDetalhe } from "../../../../lib/api";

const C = {
  blue:     "#1B4FD8",
  bluePale: "#EEF3FF",
  mint:     "#22C55E",
  mintBt:   "#4ADE80",
  mintPale: "#DCFCE7",
  navy:     "#0C1A3D",
  ink:      "#0F172A",
  gray:     "#64748B",
  grayL:    "#94A3B8",
  surface:  "#F8FAFC",
  border:   "#E2E8F0",
  white:    "#FFFFFF",
};

const ETAPA_STATUS: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  PLANEJADA:           { label: "Planejada",         bg: C.surface,   color: C.gray,   dot: C.grayL  },
  EM_EXECUCAO:         { label: "Em execução",        bg: C.bluePale,  color: C.blue,   dot: C.blue   },
  AGUARDANDO_VISTORIA: { label: "Ag. vistoria",       bg: "#FEF9C3",   color: "#92400E",dot: "#EAB308"},
  CONCLUIDA:           { label: "Concluída",          bg: C.mintPale,  color: "#166534",dot: C.mint   },
  REPROVADA:           { label: "Reprovada",          bg: "#FEE2E2",   color: "#991B1B",dot: "#EF4444"},
};

export default function ObraDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const [obra,    setObra]    = useState<ObraDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    obrasApi.buscar(id)
      .then(setObra)
      .catch((e) => setError(e.message ?? "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.blue} />
      </View>
    );
  }
  if (error || !obra) {
    return (
      <View style={styles.center}>
        <Ionicons name="warning-outline" size={40} color={C.grayL} />
        <Text style={styles.errorText}>{error ?? "Obra não encontrada"}</Text>
      </View>
    );
  }

  const credito        = obra.credito;
  const saldoDisponivel = credito ? credito.valorAprovado - credito.valorLiberado : 0;
  const pctLiberado     = credito && credito.valorAprovado > 0
    ? Math.round((credito.valorLiberado / credito.valorAprovado) * 100)
    : 0;

  const concluidas = obra.etapas.filter((e) => e.status === "CONCLUIDA").length;
  const progresso  = obra.etapas.length
    ? Math.round((concluidas / obra.etapas.length) * 100)
    : 0;

  return (
    <View style={styles.root}>
      {/* Header azul */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerNome} numberOfLines={1}>{obra.nome}</Text>
          <Text style={styles.headerEndereco} numberOfLines={1}>{obra.endereco}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Progresso geral */}
        <View style={styles.progressCard}>
          <View style={styles.progressCardTop}>
            <Text style={styles.progressLabel}>Progresso geral</Text>
            <Text style={styles.progressPct}>{progresso}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progresso}%` as any }]} />
          </View>
          <Text style={styles.progressMeta}>{concluidas} de {obra.etapas.length} etapas concluídas</Text>
        </View>

        {/* Card de crédito */}
        {credito && (
          <View style={styles.creditCard}>
            <View style={styles.creditHeader}>
              <View>
                <Text style={styles.creditSmall}>Crédito aprovado</Text>
                <Text style={styles.creditValue}>{formatarBRL(credito.valorAprovado)}</Text>
              </View>
              <View style={[styles.creditStatusBadge, { backgroundColor: credito.status === "ATIVO" ? C.mintPale : C.surface }]}>
                <Text style={[styles.creditStatusText, { color: credito.status === "ATIVO" ? "#166534" : C.gray }]}>
                  {credito.status}
                </Text>
              </View>
            </View>

            <View style={styles.creditProgressRow}>
              <View style={styles.creditProgressTrack}>
                <View style={[styles.creditProgressFill, { width: `${pctLiberado}%` as any }]} />
              </View>
              <Text style={styles.creditProgressPct}>{pctLiberado}%</Text>
            </View>

            <View style={styles.creditStats}>
              <CreditStat label="Liberado"   value={formatarBRL(credito.valorLiberado)} />
              <CreditStat label="Disponível" value={formatarBRL(saldoDisponivel)} accent />
            </View>
          </View>
        )}

        {/* Etapas */}
        <Text style={styles.sectionTitle}>Etapas da obra</Text>

        {obra.etapas.map((etapa) => {
          const meta = ETAPA_STATUS[etapa.status] ?? { label: etapa.status.replace(/_/g, " "), bg: C.surface, color: C.gray, dot: C.grayL };
          const podeEnviar = etapa.status === "EM_EXECUCAO" || etapa.status === "PLANEJADA";

          return (
            <View key={etapa.etapaId} style={styles.etapaCard}>
              {/* Número + nome + badge */}
              <View style={styles.etapaTop}>
                <View style={styles.etapaNumCircle}>
                  <Text style={styles.etapaNum}>{etapa.ordem}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.etapaNome}>{etapa.nome}</Text>
                  <Text style={styles.etapaValor}>{formatarBRL(etapa.valorLiberacao)}</Text>
                </View>
                <View style={[styles.etapaBadge, { backgroundColor: meta.bg }]}>
                  <View style={[styles.etapaDot, { backgroundColor: meta.dot }]} />
                  <Text style={[styles.etapaBadgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>

              {/* Evidências */}
              {etapa.evidencias && etapa.evidencias.length > 0 && (
                <View style={styles.evidenciasRow}>
                  <Ionicons name="images-outline" size={14} color={C.gray} />
                  <Text style={styles.evidenciasText}>
                    {etapa.evidencias.length} evidência{etapa.evidencias.length > 1 ? "s" : ""}
                  </Text>
                </View>
              )}

              {/* Botão enviar evidência */}
              {podeEnviar && (
                <TouchableOpacity
                  style={styles.enviarBtn}
                  onPress={() => router.push({
                    pathname: `/(construtor)/obras/${obra.obraId}/registrar`,
                    params: {
                      etapaId:   etapa.etapaId,
                      etapaNome: etapa.nome,
                      geoLat:    String(obra.geoLatitude),
                      geoLng:    String(obra.geoLongitude),
                      raio:      String(obra.raioValidacaoMetros),
                    },
                  })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={16} color={C.white} />
                  <Text style={styles.enviarBtnText}>Enviar evidência</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function CreditStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View>
      <Text style={{ fontSize: 11, color: C.gray, marginBottom: 3 }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: "700", color: accent ? "#166534" : C.ink }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { fontSize: 14, color: C.gray },

  header: {
    backgroundColor: C.blue,
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center", alignItems: "center",
  },
  headerTitle:   { flex: 1 },
  headerNome:    { fontSize: 17, fontWeight: "700", color: C.white },
  headerEndereco:{ fontSize: 12, color: "rgba(255,255,255,0.60)", marginTop: 2 },

  scroll:    { flex: 1 },
  container: { padding: 20, gap: 16, paddingBottom: 40 },

  // Progress summary card
  progressCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 18,
    shadowColor: C.ink, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  progressCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  progressLabel:   { fontSize: 14, fontWeight: "600", color: C.ink },
  progressPct:     { fontSize: 18, fontWeight: "800", color: C.blue },
  progressTrack:   { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  progressFill:    { height: "100%" as any, backgroundColor: C.mint, borderRadius: 4 },
  progressMeta:    { fontSize: 12, color: C.gray },

  // Credit card
  creditCard: {
    backgroundColor: C.navy, borderRadius: 16, padding: 18,
    shadowColor: C.navy, shadowOpacity: 0.18, shadowRadius: 12, elevation: 3,
  },
  creditHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  creditSmall:       { fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 4 },
  creditValue:       { fontSize: 24, fontWeight: "800", color: C.white, letterSpacing: -0.3 },
  creditStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  creditStatusText:  { fontSize: 11, fontWeight: "700" },
  creditProgressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  creditProgressTrack: { flex: 1, height: 5, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 3, overflow: "hidden" },
  creditProgressFill:  { height: "100%" as any, backgroundColor: C.mintBt, borderRadius: 3 },
  creditProgressPct:   { fontSize: 12, fontWeight: "700", color: C.mintBt },
  creditStats:         { flexDirection: "row", justifyContent: "space-between" },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: "700", color: C.ink, marginTop: 4 },

  // Etapa cards
  etapaCard: {
    backgroundColor: C.white, borderRadius: 14, padding: 16,
    shadowColor: C.ink, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    gap: 10,
  },
  etapaTop:       { flexDirection: "row", alignItems: "center", gap: 12 },
  etapaNumCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bluePale, justifyContent: "center", alignItems: "center" },
  etapaNum:       { fontSize: 14, fontWeight: "800", color: C.blue },
  etapaNome:      { fontSize: 14, fontWeight: "700", color: C.ink },
  etapaValor:     { fontSize: 12, color: C.gray, marginTop: 2 },
  etapaBadge:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  etapaDot:       { width: 6, height: 6, borderRadius: 3 },
  etapaBadgeText: { fontSize: 10, fontWeight: "700" },
  evidenciasRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  evidenciasText: { fontSize: 12, color: C.gray },
  enviarBtn: {
    backgroundColor: C.blue, borderRadius: 10,
    paddingVertical: 11, paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
  },
  enviarBtnText: { color: C.white, fontWeight: "700", fontSize: 14 },
});
