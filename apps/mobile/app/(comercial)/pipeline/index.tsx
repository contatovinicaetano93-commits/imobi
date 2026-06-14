import {
  View, Text, ScrollView, StyleSheet,
  StatusBar, Platform, TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { comercialApi, type PipelineLead } from "../../../lib/api";

const C = {
  blue:   "#1B4FD8",
  navy:   "#0C1A3D",
  mint:   "#22C55E",
  ink:    "#0F172A",
  gray:   "#64748B",
  grayL:  "#94A3B8",
  surface:"#F8FAFC",
  border: "#E2E8F0",
  white:  "#FFFFFF",
  amber:  "#F59E0B",
};

const ETAPAS: { key: string; label: string; color: string }[] = [
  { key: "PROSPECCAO",   label: "Prospecção",   color: "#6366F1" },
  { key: "QUALIFICACAO", label: "Qualificação",  color: C.amber },
  { key: "PROPOSTA",     label: "Proposta",      color: C.blue },
  { key: "NEGOCIACAO",   label: "Negociação",    color: "#8B5CF6" },
  { key: "FECHADO",      label: "Fechado",       color: C.mint },
  { key: "PERDIDO",      label: "Perdido",       color: "#EF4444" },
];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PipelineScreen() {
  const [leads, setLeads]       = useState<PipelineLead[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filtro, setFiltro]     = useState<string | null>(null);

  useEffect(() => {
    comercialApi.pipeline()
      .then(setLeads)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filtro ? leads.filter((l) => l.etapa === filtro) : leads;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={s.header}>
        <Text style={s.headerTitle}>Pipeline</Text>
        <Text style={s.headerSub}>{leads.length} leads no funil</Text>
      </View>

      {/* Filtro por etapa */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        style={s.filterScroll}
      >
        <TouchableOpacity
          style={[s.filterChip, filtro === null && s.filterChipActive]}
          onPress={() => setFiltro(null)}
        >
          <Text style={[s.filterText, filtro === null && s.filterTextActive]}>Todos</Text>
        </TouchableOpacity>
        {ETAPAS.map((e) => (
          <TouchableOpacity
            key={e.key}
            style={[s.filterChip, filtro === e.key && { backgroundColor: e.color }]}
            onPress={() => setFiltro(e.key === filtro ? null : e.key)}
          >
            <Text style={[s.filterText, filtro === e.key && { color: C.white }]}>{e.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={C.blue} style={{ marginVertical: 32 }} />
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Nenhum lead encontrado</Text>
            <Text style={s.emptySub}>Adicione leads pelo painel web.</Text>
          </View>
        ) : (
          filtered.map((lead) => {
            const etapa = ETAPAS.find((e) => e.key === lead.etapa);
            return (
              <View key={lead.leadId} style={s.card}>
                <View style={s.cardTop}>
                  <Text style={s.cardNome}>{lead.nomeCliente}</Text>
                  <View style={[s.badge, { backgroundColor: etapa?.color ?? C.gray }]}>
                    <Text style={s.badgeText}>{etapa?.label ?? lead.etapa}</Text>
                  </View>
                </View>
                <Text style={s.cardDetalhe}>{lead.tipoProjeto} · {formatBRL(lead.valorEstimado)}</Text>
                {lead.proximaAcao ? (
                  <View style={s.acaoRow}>
                    <Text style={s.acaoLabel}>Próxima ação:</Text>
                    <Text style={s.acaoText}>{lead.proximaAcao}</Text>
                  </View>
                ) : null}
                <Text style={s.cardData}>Atualizado em {new Date(lead.atualizadoEm).toLocaleDateString("pt-BR")}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.navy },
  scroll: { flex: 1, backgroundColor: C.surface },
  header: {
    paddingTop:        Platform.OS === "ios" ? 60 : 40,
    paddingBottom:     16,
    paddingHorizontal: 20,
    backgroundColor:   C.navy,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: C.white },
  headerSub:   { fontSize: 13, color: C.grayL, marginTop: 4 },

  filterScroll: { backgroundColor: C.navy, maxHeight: 52 },
  filterRow:    { paddingHorizontal: 16, paddingBottom: 12, gap: 8, flexDirection: "row" },
  filterChip:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#1E3A8A" },
  filterChipActive: { backgroundColor: C.blue },
  filterText:   { fontSize: 12, color: C.grayL, fontWeight: "600" },
  filterTextActive: { color: C.white },

  content: { padding: 16, gap: 10, paddingBottom: 48 },

  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.ink },
  emptySub:   { fontSize: 13, color: C.grayL },

  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 16, gap: 6,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTop:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardNome:   { fontSize: 15, fontWeight: "700", color: C.ink, flex: 1, marginRight: 8 },
  cardDetalhe:{ fontSize: 13, color: C.gray },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, color: C.white, fontWeight: "700" },
  acaoRow:   { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  acaoLabel: { fontSize: 12, color: C.gray, fontWeight: "600" },
  acaoText:  { fontSize: 12, color: C.blue, fontWeight: "600", flex: 1 },
  cardData:  { fontSize: 11, color: C.grayL },
});
