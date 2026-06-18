import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../../components/ScreenHeader";
import { managerApi, type ManagerDashboard } from "../../../../lib/api-roles";

const PURPLE = "#7C3AED";
const PURPLE_PALE = "#EDE9FE";

export default function GestorDashboard() {
  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setData(await managerApi.dashboard()); } catch { /* */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  if (loading && !data) return <View style={styles.center}><ActivityIndicator color={PURPLE} /></View>;

  const d = data!;
  const totalFilas = d.filaAprovacoes + d.filaKyc;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Observatório" subtitle="Gestor de Fundo · somente leitura" dark accent={PURPLE} />
      <ScrollView contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={PURPLE} />}>
        {/* Layout vertical tipo timeline — diferente do admin grid */}
        <View style={styles.pulseCard}>
          <View style={styles.pulseDot} />
          <Text style={styles.pulseText}>Operação em tempo real</Text>
          <Text style={styles.pulseSub}>{totalFilas} itens nas filas</Text>
        </View>

        <View style={styles.timeline}>
          <TimelineItem
            icon="time-outline"
            label="Fila de aprovações"
            value={d.filaAprovacoes}
            desc="Etapas aguardando liberação após vistoria"
            highlight={d.filaAprovacoes > 0}
          />
          <TimelineItem
            icon="document-text-outline"
            label="KYC em análise"
            value={d.filaKyc}
            desc="Documentos de construtores pendentes"
            highlight={d.filaKyc > 0}
          />
          <TimelineItem
            icon="cash-outline"
            label="Créditos ativos"
            value={d.creditosAtivos}
            desc="Contratos em andamento na plataforma"
          />
          <TimelineItem
            icon="business-outline"
            label="Obras ativas"
            value={d.obrasAtivas}
            desc="Obras com execução em curso"
            last
          />
        </View>

        <View style={styles.readOnlyBanner}>
          <Ionicons name="eye-off-outline" size={20} color={PURPLE} />
          <Text style={styles.readOnlyText}>
            Como gestor, você monitora filas e comitê. Aprovações de etapa e voto final são feitos pelo admin.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function TimelineItem({
  icon, label, value, desc, highlight, last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  desc: string;
  highlight?: boolean;
  last?: boolean;
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineIcon, highlight && styles.timelineIconAlert]}>
          <Ionicons name={icon} size={18} color={highlight ? PURPLE : "#64748B"} />
        </View>
        {!last && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineLabel}>{label}</Text>
          <Text style={[styles.timelineVal, highlight && { color: PURPLE }]}>{value}</Text>
        </View>
        <Text style={styles.timelineDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, gap: 20, paddingBottom: 40 },
  pulseCard: { backgroundColor: PURPLE_PALE, borderRadius: 20, padding: 20, alignItems: "center", gap: 6 },
  pulseDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: PURPLE },
  pulseText: { fontSize: 16, fontWeight: "800", color: "#4C1D95" },
  pulseSub: { fontSize: 13, color: "#6D28D9" },
  timeline: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EDE9FE" },
  timelineRow: { flexDirection: "row", gap: 14 },
  timelineLeft: { alignItems: "center", width: 36 },
  timelineIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F5F3FF", alignItems: "center", justifyContent: "center" },
  timelineIconAlert: { backgroundColor: PURPLE_PALE },
  timelineLine: { width: 2, flex: 1, backgroundColor: "#EDE9FE", marginVertical: 4 },
  timelineContent: { flex: 1, paddingBottom: 20 },
  timelineHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timelineLabel: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  timelineVal: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  timelineDesc: { fontSize: 12, color: "#64748B", marginTop: 4, lineHeight: 17 },
  readOnlyBanner: { flexDirection: "row", gap: 12, backgroundColor: "#FFF", padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "#EDE9FE" },
  readOnlyText: { flex: 1, fontSize: 12, color: "#64748B", lineHeight: 18 },
});
