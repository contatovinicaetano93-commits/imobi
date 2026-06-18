import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, TextInput } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import ScreenHeader from "../../../../components/ScreenHeader";
import KeyboardAwareScroll from "../../../../components/KeyboardAwareScroll";
import { comiteApi, type ComiteItem } from "../../../../lib/api-roles";
import { formatarBRL } from "@imbobi/core";
import {
  clampTaxaAprovacao,
  formatTaxaPercent,
  formatTaxaSimulacao,
  TAXA_MIN,
  TAXA_SIMULACAO,
  MSG_TAXA_SIMULACAO,
} from "../../../../lib/tax-config";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ABERTO: { label: "Aguarda parecer eng.", color: "#2563EB" },
  EM_VOTACAO: { label: "Pronto p/ voto", color: "#DC2626" },
  ENCERRADO: { label: "Encerrado", color: "#64748B" },
};

export default function AdminComiteScreen() {
  const [items, setItems] = useState<ComiteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [taxaAprovada, setTaxaAprovada] = useState(TAXA_SIMULACAO);
  const [justificativa, setJustificativa] = useState("");

  const load = useCallback(async () => {
    try {
      const list = await comiteApi.listar();
      setItems(list.filter((c) => c.status !== "ENCERRADO"));
    } catch { /* */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const votar = (id: string, voto: "APROVADO" | "REPROVADO") => {
    if (voto === "APROVADO" && taxaAprovada > TAXA_SIMULACAO) {
      Alert.alert("Taxa inválida", "A taxa aprovada não pode ser maior que a simulada (1,90% a.m.).");
      return;
    }
    const msg = voto === "APROVADO"
      ? `Aprovar com taxa ${formatTaxaPercent(taxaAprovada)}?\n(Simulado em ${formatTaxaSimulacao()})`
      : "Reprovar solicitação?";
    Alert.alert(voto === "APROVADO" ? "Aprovar crédito" : "Reprovar crédito", msg, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: async () => {
        try {
          await comiteApi.votar(
            id,
            voto,
            justificativa || undefined,
            voto === "APROVADO" ? taxaAprovada : undefined
          );
          setExpanded(null);
          setJustificativa("");
          setTaxaAprovada(TAXA_SIMULACAO);
          load();
        } catch (e: unknown) {
          Alert.alert("Erro", e instanceof Error ? e.message : "Falha ao votar");
        }
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#DC2626" /></View>;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Comitê de crédito" subtitle="Aprovar e reduzir taxa" dark accent="#DC2626" />
      <KeyboardAwareScroll contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <View style={styles.policyBanner}>
          <Ionicons name="lock-closed" size={18} color="#DC2626" />
          <Text style={styles.policyText}>{MSG_TAXA_SIMULACAO}</Text>
        </View>

        <View style={styles.pipeline}>
          <PipelineStep n={1} label="Simulação 1,90%" done />
          <PipelineStep n={2} label="Parecer eng." active />
          <PipelineStep n={3} label="Taxa final ≤ 1,90%" />
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-done-circle" size={48} color="#CBD5E1" />
            <Text style={styles.empty}>Nenhuma solicitação pendente.</Text>
          </View>
        ) : items.map((c) => {
          const meta = STATUS_MAP[c.status] ?? { label: c.status, color: "#64748B" };
          const open = expanded === c.comiteId;
          const taxaSim = c.taxaMensal ?? c.solicitacao?.taxaMensal ?? TAXA_SIMULACAO;
          return (
            <View key={c.comiteId} style={styles.card}>
              <TouchableOpacity onPress={() => { setExpanded(open ? null : c.comiteId); setTaxaAprovada(TAXA_SIMULACAO); }}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.nome}>{c.obra?.nome ?? "Solicitação de crédito"}</Text>
                    <Text style={styles.valor}>{formatarBRL(c.valorSolicitado)}</Text>
                    <Text style={styles.simTag}>Simulado em {formatTaxaPercent(taxaSim)}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: meta.color + "20" }]}>
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              {open && c.status !== "ENCERRADO" && (
                <View style={styles.expand}>
                  <Text style={styles.expandLabel}>Taxa aprovada (reduzir se couber)</Text>
                  <Text style={styles.taxVal}>{formatTaxaPercent(taxaAprovada)}</Text>
                  {taxaAprovada < TAXA_SIMULACAO && (
                    <View style={styles.benefit}>
                      <Ionicons name="trending-down" size={14} color="#16A34A" />
                      <Text style={styles.benefitText}>
                        {(TAXA_SIMULACAO - taxaAprovada) * 100 > 0
                          ? `Redução de ${((TAXA_SIMULACAO - taxaAprovada) * 100).toFixed(2).replace(".", ",")} p.p. vs simulação`
                          : ""}
                      </Text>
                    </View>
                  )}
                  <Slider
                    minimumValue={TAXA_MIN}
                    maximumValue={TAXA_SIMULACAO}
                    step={0.0005}
                    value={taxaAprovada}
                    onValueChange={(v) => setTaxaAprovada(clampTaxaAprovacao(v))}
                    minimumTrackTintColor="#DC2626"
                    thumbTintColor="#DC2626"
                  />
                  <View style={styles.taxRange}>
                    <Text style={styles.taxRangeText}>1,5% mín.</Text>
                    <Text style={styles.taxRangeText}>1,90% máx.</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Justificativa (opcional)"
                    placeholderTextColor="#94A3B8"
                    value={justificativa}
                    onChangeText={setJustificativa}
                    multiline
                  />
                  <View style={styles.row}>
                    <TouchableOpacity style={[styles.btn, styles.approve]} onPress={() => votar(c.comiteId, "APROVADO")}>
                      <Text style={styles.btnText}>Aprovar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.reject]} onPress={() => votar(c.comiteId, "REPROVADO")}>
                      <Text style={styles.btnText}>Reprovar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </KeyboardAwareScroll>
    </View>
  );
}

function PipelineStep({ n, label, done, active }: { n: number; label: string; done?: boolean; active?: boolean }) {
  return (
    <View style={styles.pipeStep}>
      <View style={[styles.pipeDot, done && styles.pipeDone, active && styles.pipeActive]}>
        <Text style={styles.pipeNum}>{n}</Text>
      </View>
      <Text style={styles.pipeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  policyBanner: { flexDirection: "row", gap: 10, backgroundColor: "#FEF2F2", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#FECACA" },
  policyText: { flex: 1, fontSize: 12, color: "#991B1B", lineHeight: 17 },
  pipeline: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#FFF", borderRadius: 14, padding: 14 },
  pipeStep: { alignItems: "center", flex: 1, gap: 4 },
  pipeDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  pipeDone: { backgroundColor: "#BBF7D0" },
  pipeActive: { backgroundColor: "#FECACA" },
  pipeNum: { fontSize: 12, fontWeight: "800", color: "#0F172A" },
  pipeLabel: { fontSize: 9, color: "#64748B", textAlign: "center" },
  emptyBox: { alignItems: "center", gap: 12, marginTop: 40 },
  empty: { textAlign: "center", color: "#64748B" },
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#FECACA", gap: 8 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  nome: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  valor: { fontSize: 22, fontWeight: "800", color: "#DC2626", marginTop: 4 },
  simTag: { fontSize: 11, color: "#64748B", marginTop: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: "700" },
  expand: { borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 12, gap: 8 },
  expandLabel: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  taxVal: { fontSize: 24, fontWeight: "800", color: "#DC2626", textAlign: "center" },
  benefit: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  benefitText: { fontSize: 12, color: "#16A34A", fontWeight: "600" },
  taxRange: { flexDirection: "row", justifyContent: "space-between" },
  taxRangeText: { fontSize: 11, color: "#64748B" },
  input: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12, fontSize: 13, color: "#0F172A", minHeight: 60, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: "center" },
  approve: { backgroundColor: "#16A34A" },
  reject: { backgroundColor: "#64748B" },
  btnText: { color: "#FFF", fontWeight: "700" },
});
