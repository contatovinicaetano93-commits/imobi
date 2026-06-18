import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, TextInput } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../../components/ScreenHeader";
import KeyboardAwareScroll from "../../../../components/KeyboardAwareScroll";
import { engenheiroApi, type VisitaEng } from "../../../../lib/api-roles";

const BLUE = "#2563EB";

function formatData(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export default function EngVisitasScreen() {
  const [visitas, setVisitas] = useState<VisitaEng[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [obs, setObs] = useState("");

  const load = useCallback(async () => {
    try { setVisitas(await engenheiroApi.visitas()); } catch { /* */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const atualizar = async (v: VisitaEng, status: string) => {
    try {
      await engenheiroApi.atualizarVisita(v.visitaId, { status, observacoes: obs || undefined });
      setObs("");
      setExpanded(null);
      load();
    } catch (e: unknown) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Falha");
    }
  };

  const acao = (v: VisitaEng, tipo: "iniciar" | "validar" | "rejeitar") => {
    const map = {
      iniciar: { status: "INICIADA", title: "Iniciar vistoria", msg: "Confirmar início no local?" },
      validar: { status: "CONCLUIDA", title: "Validar etapa", msg: "Aprovar evidências desta etapa?" },
      rejeitar: { status: "REJEITADA", title: "Rejeitar", msg: "Informe observação e confirme rejeição." },
    };
    const { status, title, msg } = map[tipo];
    if (tipo === "rejeitar" && !obs.trim()) {
      Alert.alert("Observação obrigatória", "Descreva o motivo da rejeição.");
      return;
    }
    Alert.alert(title, msg, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: () => atualizar(v, status) },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={BLUE} /></View>;

  const agendadas = visitas.filter((v) => v.status === "AGENDADA");
  const emAndamento = visitas.filter((v) => v.status === "INICIADA");

  return (
    <View style={styles.root}>
      <ScreenHeader title="Campo" subtitle="Vistorias e validação técnica" dark accent={BLUE} />
      <KeyboardAwareScroll contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <View style={styles.summary}>
          <SummaryChip n={agendadas.length} label="Agendadas" />
          <SummaryChip n={emAndamento.length} label="Em campo" />
          <SummaryChip n={visitas.length} label="Total" muted />
        </View>

        <Text style={styles.section}>PRÓXIMAS VISTORIAS</Text>
        {visitas.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="construct-outline" size={48} color="#BFDBFE" />
            <Text style={styles.empty}>Nenhuma vistoria pendente.</Text>
          </View>
        ) : visitas.map((v) => {
          const open = expanded === v.visitaId;
          return (
            <View key={v.visitaId} style={styles.card}>
              <View style={styles.dateCol}>
                <Text style={styles.dateDay}>{formatData(v.dataAgendada).split(" ")[0]}</Text>
                <Text style={styles.dateTime}>{formatData(v.dataAgendada).split(" ").slice(1).join(" ")}</Text>
              </View>
              <View style={styles.cardBody}>
                <TouchableOpacity onPress={() => setExpanded(open ? null : v.visitaId)}>
                  <Text style={styles.obra}>{v.obraNome}</Text>
                  <Text style={styles.etapa}>{v.etapaNome}</Text>
                  <View style={[styles.chip, v.status === "CONCLUIDA" && styles.chipOk]}>
                    <Text style={styles.chipText}>{v.status.replace(/_/g, " ")}</Text>
                  </View>
                  {v.obra?.endereco && <Text style={styles.end}>{v.obra.endereco}</Text>}
                </TouchableOpacity>
                {open && v.status !== "CONCLUIDA" && (
                  <View style={styles.actions}>
                    <TextInput
                      style={styles.obsInput}
                      placeholder="Observações técnicas..."
                      placeholderTextColor="#94A3B8"
                      value={obs}
                      onChangeText={setObs}
                      multiline
                    />
                    {v.status === "AGENDADA" && (
                      <TouchableOpacity style={styles.btnStart} onPress={() => acao(v, "iniciar")}>
                        <Ionicons name="navigate" size={16} color="#FFF" />
                        <Text style={styles.btnText}>Iniciar vistoria</Text>
                      </TouchableOpacity>
                    )}
                    {v.status === "INICIADA" && (
                      <View style={styles.btnRow}>
                        <TouchableOpacity style={styles.btnOk} onPress={() => acao(v, "validar")}>
                          <Text style={styles.btnText}>Validar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnNo} onPress={() => acao(v, "rejeitar")}>
                          <Text style={styles.btnText}>Rejeitar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </KeyboardAwareScroll>
    </View>
  );
}

function SummaryChip({ n, label, muted }: { n: number; label: string; muted?: boolean }) {
  return (
    <View style={[styles.chipSummary, muted && { opacity: 0.7 }]}>
      <Text style={styles.chipSummaryN}>{n}</Text>
      <Text style={styles.chipSummaryL}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EFF6FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  summary: { flexDirection: "row", gap: 10 },
  chipSummary: { flex: 1, backgroundColor: "#FFF", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#BFDBFE" },
  chipSummaryN: { fontSize: 22, fontWeight: "800", color: BLUE },
  chipSummaryL: { fontSize: 10, color: "#64748B", fontWeight: "600" },
  section: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: "#64748B", marginTop: 4 },
  emptyBox: { alignItems: "center", gap: 12, marginTop: 40 },
  empty: { color: "#64748B" },
  card: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#BFDBFE" },
  dateCol: { width: 72, backgroundColor: BLUE, padding: 10, alignItems: "center", justifyContent: "center" },
  dateDay: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  dateTime: { color: "#BFDBFE", fontSize: 9, marginTop: 2, textAlign: "center" },
  cardBody: { flex: 1, padding: 14, gap: 4 },
  obra: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  etapa: { fontSize: 13, color: BLUE, fontWeight: "600" },
  chip: { alignSelf: "flex-start", backgroundColor: "#DBEAFE", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  chipOk: { backgroundColor: "#DCFCE7" },
  chipText: { fontSize: 9, fontWeight: "700", color: BLUE },
  end: { fontSize: 11, color: "#64748B", marginTop: 4 },
  actions: { marginTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: "#EFF6FF", paddingTop: 10 },
  obsInput: { borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 10, padding: 10, fontSize: 12, minHeight: 56, textAlignVertical: "top" },
  btnStart: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: BLUE, padding: 12, borderRadius: 10 },
  btnRow: { flexDirection: "row", gap: 8 },
  btnOk: { flex: 1, backgroundColor: "#16A34A", padding: 12, borderRadius: 10, alignItems: "center" },
  btnNo: { flex: 1, backgroundColor: "#64748B", padding: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
});
