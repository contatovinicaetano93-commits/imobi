import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, Alert, StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { comercialApi, type LeadDetalhe, type Stage } from "../../../lib/api";

const ATIVIDADE_TIPOS = ["CALL_OUTBOUND", "EMAIL_SENT", "MEETING", "PROPOSAL_SENT", "FOLLOW_UP_SET"];
const ATIVIDADE_ICONS: Record<string, string> = {
  CALL_OUTBOUND: "call-outline",
  EMAIL_SENT: "mail-outline",
  MEETING: "people-outline",
  PROPOSAL_SENT: "document-text-outline",
  FOLLOW_UP_SET: "alarm-outline",
};

function tempoAtras(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  return d > 0 ? `${d}d atrás` : h > 0 ? `${h}h atrás` : "agora";
}

export default function LeadDetalheScreen() {
  const { leadId } = useLocalSearchParams<{ leadId: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetalhe | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAtiv, setModalAtiv] = useState(false);
  const [modalStage, setModalStage] = useState(false);
  const [tipoAtiv, setTipoAtiv] = useState("CALL_OUTBOUND");
  const [descAtiv, setDescAtiv] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = async () => {
    try {
      const [l, st] = await Promise.all([comercialApi.detalhe(leadId), comercialApi.stages()]);
      setLead(l);
      setStages(st);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar o lead.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleAtividade = async () => {
    if (!descAtiv.trim()) { Alert.alert("Descrição obrigatória"); return; }
    setEnviando(true);
    try {
      await comercialApi.adicionarAtividade(leadId, tipoAtiv, descAtiv.trim());
      setModalAtiv(false);
      setDescAtiv("");
      carregar();
    } catch {
      Alert.alert("Erro", "Não foi possível registrar a atividade.");
    } finally {
      setEnviando(false);
    }
  };

  const handleMoverStage = async (stageId: string) => {
    setModalStage(false);
    try {
      await comercialApi.moverStage(leadId, stageId);
      carregar();
    } catch {
      Alert.alert("Erro", "Não foi possível mover o lead.");
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#ea580c" /></View>;
  if (!lead) return null;

  const score = lead.scoreHistorico[0]?.scoreFinal ?? 0;
  const prob = lead.scoreHistorico[0]?.probabilidadeClosing ?? 0;
  const scoreCor = score >= 70 ? "#16a34a" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color="#1e3a5f" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerNome} numberOfLines={1}>{lead.clienteNome}</Text>
          <TouchableOpacity onPress={() => setModalStage(true)} style={s.stageChip}>
            <Text style={[s.stageChipText, { color: lead.stage?.cor ?? "#ea580c" }]}>{lead.stage?.nome}</Text>
            <Ionicons name="chevron-down" size={13} color={lead.stage?.cor ?? "#ea580c"} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.btnAtiv} onPress={() => setModalAtiv(true)}>
          <Ionicons name="add-circle-outline" size={20} color="#ea580c" />
          <Text style={s.btnAtivText}>Atividade</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Score */}
        <View style={s.scoreCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.scoreLabel}>Score de conversão</Text>
            <Text style={[s.scoreValor, { color: scoreCor }]}>{Math.round(score)}/100</Text>
            <Text style={s.scoreProb}>{Math.round(prob * 100)}% probabilidade de fechamento</Text>
          </View>
          <View style={[s.scoreCircle, { borderColor: scoreCor }]}>
            <Text style={[s.scoreCircleNum, { color: scoreCor }]}>{Math.round(score)}</Text>
          </View>
        </View>

        {/* Contato */}
        <View style={s.card}>
          <Row label="E-mail" value={lead.clienteEmail || "—"} />
          <Row label="Telefone" value={lead.clienteTelefone || "—"} />
          <Row label="Fonte" value={lead.fonte} />
          {lead.segmentoCliente && <Row label="Segmento" value={lead.segmentoCliente} />}
          <Row label="Cadastrado" value={new Date(lead.criadoEm).toLocaleDateString("pt-BR")} />
        </View>

        {/* Histórico de atividades */}
        <Text style={s.sectionTitle}>Atividades ({lead.atividades.length})</Text>
        {lead.atividades.length === 0 ? (
          <Text style={s.empty}>Nenhuma atividade registrada</Text>
        ) : (
          lead.atividades.map((a) => (
            <View key={a.atividadeId} style={s.atividadeCard}>
              <View style={s.atividadeIcon}>
                <Ionicons name={(ATIVIDADE_ICONS[a.tipo] ?? "ellipse-outline") as any} size={18} color="#ea580c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.atividadeTipo}>{a.tipo.replace(/_/g, " ")}</Text>
                <Text style={s.atividadeDesc}>{a.descricao}</Text>
              </View>
              <Text style={s.atividadeTempo}>{tempoAtras(a.criadoEm)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal: nova atividade */}
      <Modal visible={modalAtiv} transparent animationType="slide">
        <View style={s.sheetOverlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitulo}>Registrar atividade</Text>
              <TouchableOpacity onPress={() => setModalAtiv(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {ATIVIDADE_TIPOS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.tipoChip, tipoAtiv === t && s.tipoChipAtivo]}
                    onPress={() => setTipoAtiv(t)}
                  >
                    <Ionicons name={(ATIVIDADE_ICONS[t] ?? "ellipse-outline") as any} size={14} color={tipoAtiv === t ? "#ea580c" : "#6b7280"} />
                    <Text style={[s.tipoChipText, tipoAtiv === t && { color: "#ea580c" }]}>{t.replace(/_/g, " ")}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TextInput
              style={s.textarea}
              placeholder="O que aconteceu? (notas da conversa, próximos passos...)"
              placeholderTextColor="#9ca3af"
              value={descAtiv}
              onChangeText={setDescAtiv}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity style={[s.btnConfirmar, enviando && { opacity: 0.5 }]} onPress={handleAtividade} disabled={enviando}>
              {enviando ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.btnConfirmarText}>Registrar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: mover stage */}
      <Modal visible={modalStage} transparent animationType="slide">
        <TouchableOpacity style={s.sheetOverlay} onPress={() => setModalStage(false)} activeOpacity={1}>
          <View style={s.sheet}>
            <Text style={s.sheetTitulo}>Mover para etapa</Text>
            {stages.map((st) => (
              <TouchableOpacity
                key={st.stageId}
                style={[s.stageRow, st.stageId === lead.stageId && { backgroundColor: "#fff7ed" }]}
                onPress={() => handleMoverStage(st.stageId)}
              >
                <View style={[s.stageDot, { backgroundColor: st.cor }]} />
                <Text style={[s.stageRowText, st.stageId === lead.stageId && { color: "#ea580c", fontWeight: "700" }]}>{st.nome}</Text>
                {st.stageId === lead.stageId && <Ionicons name="checkmark" size={16} color="#ea580c" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 54, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", gap: 10 },
  headerNome: { fontSize: 16, fontWeight: "700", color: "#1e3a5f" },
  stageChip: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  stageChipText: { fontSize: 12, fontWeight: "600" },
  btnAtiv: { flexDirection: "row", alignItems: "center", gap: 4 },
  btnAtivText: { fontSize: 13, color: "#ea580c", fontWeight: "600" },
  scoreCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#f3f4f6" },
  scoreLabel: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  scoreValor: { fontSize: 24, fontWeight: "700" },
  scoreProb: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  scoreCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, justifyContent: "center", alignItems: "center" },
  scoreCircleNum: { fontSize: 18, fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#f3f4f6" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  rowLabel: { fontSize: 13, color: "#6b7280" },
  rowValue: { fontSize: 13, color: "#111827", fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 10 },
  atividadeCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, gap: 10, borderWidth: 1, borderColor: "#f3f4f6" },
  atividadeIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#fff7ed", justifyContent: "center", alignItems: "center" },
  atividadeTipo: { fontSize: 12, fontWeight: "600", color: "#374151", textTransform: "uppercase" },
  atividadeDesc: { fontSize: 13, color: "#4b5563", marginTop: 3 },
  atividadeTempo: { fontSize: 11, color: "#9ca3af" },
  empty: { fontSize: 14, color: "#9ca3af", textAlign: "center", padding: 24 },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sheetTitulo: { fontSize: 16, fontWeight: "700", color: "#111827" },
  tipoChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tipoChipAtivo: { borderColor: "#ea580c", backgroundColor: "#fff7ed" },
  tipoChipText: { fontSize: 12, color: "#6b7280" },
  textarea: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, fontSize: 14, color: "#111827", minHeight: 90, marginBottom: 14 },
  btnConfirmar: { backgroundColor: "#ea580c", borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnConfirmarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  stageRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 10, marginBottom: 4 },
  stageDot: { width: 10, height: 10, borderRadius: 5 },
  stageRowText: { flex: 1, fontSize: 14, color: "#374151" },
});
