import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../../components/ScreenHeader";
import { comiteApi, type ComiteItem } from "../../../../lib/api-roles";
import { formatarBRL, formatarPercentual } from "@imbobi/core";
import { formatTaxaFaixaAprovacao, formatTaxaSimulacao } from "../../../../lib/tax-config";

const PIPELINE = ["PENDENTE", "EM_COMITE", "APROVADO", "REPROVADO"];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ABERTO: { bg: "#DBEAFE", color: "#2563EB", label: "Parecer eng." },
  EM_VOTACAO: { bg: "#FEE2E2", color: "#DC2626", label: "Voto admin" },
  ENCERRADO: { bg: "#F1F5F9", color: "#64748B", label: "Encerrado" },
};

export default function GestorComiteScreen() {
  const [items, setItems] = useState<ComiteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await comiteApi.listar()); } catch { /* */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={styles.center}><ActivityIndicator color="#7C3AED" /></View>;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Comitê" subtitle="Observação — sem ações" dark accent="#7C3AED" />
      <ScrollView contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <View style={styles.notice}>
          <Ionicons name="information-circle" size={18} color="#7C3AED" />
          <Text style={styles.noticeText}>
            Simulação trava em 1,90% a.m. O admin pode aprovar com taxa menor ({formatTaxaFaixaAprovacao()}).
          </Text>
        </View>
        {items.length === 0 ? (
          <Text style={styles.empty}>Nenhum processo no comitê.</Text>
        ) : items.map((c) => {
          const st = STATUS_STYLE[c.status] ?? { bg: "#F1F5F9", color: "#64748B", label: c.status };
          const taxa = c.taxaMensal ?? c.solicitacao?.taxaMensal;
          return (
            <View key={c.comiteId} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.nome}>{c.obra?.nome ?? "Crédito"}</Text>
                <View style={[styles.pill, { backgroundColor: st.bg }]}>
                  <Text style={[styles.pillText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.valor}>{formatarBRL(c.valorSolicitado)}</Text>
              {taxa != null && (
                <Text style={styles.taxa}>Taxa: {formatarPercentual(taxa)} a.m.</Text>
              )}
              <View style={styles.miniPipe}>
                {PIPELINE.slice(0, 3).map((p, i) => (
                  <View key={p} style={[styles.miniStep, i <= 1 && styles.miniStepDone]} />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  notice: { flexDirection: "row", gap: 10, backgroundColor: "#EDE9FE", padding: 14, borderRadius: 12 },
  noticeText: { flex: 1, fontSize: 12, color: "#4C1D95", lineHeight: 17 },
  empty: { textAlign: "center", color: "#64748B", marginTop: 40 },
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EDE9FE", gap: 6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nome: { fontSize: 14, fontWeight: "700", color: "#0F172A", flex: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 10, fontWeight: "700" },
  valor: { fontSize: 22, fontWeight: "800", color: "#7C3AED" },
  taxa: { fontSize: 12, color: "#64748B" },
  miniPipe: { flexDirection: "row", gap: 4, marginTop: 8 },
  miniStep: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#EDE9FE" },
  miniStepDone: { backgroundColor: "#7C3AED" },
});
