import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, ScrollView, Modal, TextInput, StyleSheet, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { comercialApi, type Stage, type Lead, type CriarLeadInput } from "../../../lib/api";

const FONTES = ["WEBSITE", "INDICACAO", "MARKETPLACE", "CAMPANHA_DIGITAL", "OFFLINE", "PARCEIRO"];

function ScoreBadge({ score }: { score: number }) {
  const cor = score >= 70 ? "#16a34a" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <View style={[s.scoreBadge, { backgroundColor: cor + "20" }]}>
      <Text style={[s.scoreNum, { color: cor }]}>{Math.round(score)}</Text>
    </View>
  );
}

function diasNaStage(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? "hoje" : `${d}d`;
}

export default function PipelineScreen() {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stageAtiva, setStageAtiva] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState<CriarLeadInput>({ clienteNome: "", clienteEmail: "", clienteTelefone: "", fonte: "WEBSITE" });
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [st, l] = await Promise.all([comercialApi.stages(), comercialApi.leads({ limit: "100" })]);
      setStages(st);
      setLeads(l.leads);
      if (!stageAtiva && st.length > 0) setStageAtiva(st[0].stageId);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { carregar(); }, []);

  const leadsDaStage = leads.filter((l) => l.stageId === stageAtiva);
  const stageInfo = stages.find((s) => s.stageId === stageAtiva);

  const handleCriar = async () => {
    if (!form.clienteNome.trim()) { Alert.alert("Nome obrigatório"); return; }
    setCriando(true);
    try {
      await comercialApi.criarLead(form);
      setModalNovo(false);
      setForm({ clienteNome: "", clienteEmail: "", clienteTelefone: "", fonte: "WEBSITE" });
      carregar();
    } catch {
      Alert.alert("Erro", "Não foi possível criar o lead.");
    } finally {
      setCriando(false);
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#ea580c" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.titulo}>Pipeline</Text>
        <TouchableOpacity style={s.btnNovo} onPress={() => setModalNovo(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.btnNovoText}>Novo lead</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs de stage */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
        {stages.map((st) => {
          const ativa = st.stageId === stageAtiva;
          const count = leads.filter((l) => l.stageId === st.stageId).length;
          return (
            <TouchableOpacity
              key={st.stageId}
              style={[s.tab, ativa && { borderBottomColor: st.cor, borderBottomWidth: 2.5 }]}
              onPress={() => setStageAtiva(st.stageId)}
            >
              <Text style={[s.tabText, ativa && { color: st.cor, fontWeight: "700" }]}>{st.nome}</Text>
              {count > 0 && (
                <View style={[s.tabBadge, { backgroundColor: ativa ? st.cor : "#e5e7eb" }]}>
                  <Text style={[s.tabBadgeText, { color: ativa ? "#fff" : "#6b7280" }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista de leads da stage */}
      <FlatList
        data={leadsDaStage}
        keyExtractor={(l) => l.leadId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} tintColor="#ea580c" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={40} color="#d1d5db" />
            <Text style={s.emptyText}>Nenhum lead nesta etapa</Text>
          </View>
        }
        renderItem={({ item }) => {
          const score = item.scoreHistorico[0]?.scoreFinal ?? 0;
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push(`/(comercial)/leads/${item.leadId}` as any)}
              activeOpacity={0.85}
            >
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.leadNome}>{item.clienteNome}</Text>
                  <Text style={s.leadMeta}>{item.clienteTelefone}</Text>
                  <Text style={s.leadMeta}>{item.fonte}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <ScoreBadge score={score} />
                  <Text style={s.diasText}>{diasNaStage(item.criadoEm)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Modal: novo lead */}
      <Modal visible={modalNovo} transparent animationType="slide">
        <View style={s.sheetOverlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitulo}>Novo lead</Text>
              <TouchableOpacity onPress={() => setModalNovo(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TextInput style={s.input} placeholder="Nome *" value={form.clienteNome} onChangeText={(v) => setForm((f) => ({ ...f, clienteNome: v }))} />
            <TextInput style={s.input} placeholder="E-mail" value={form.clienteEmail} onChangeText={(v) => setForm((f) => ({ ...f, clienteEmail: v }))} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={s.input} placeholder="Telefone" value={form.clienteTelefone} onChangeText={(v) => setForm((f) => ({ ...f, clienteTelefone: v }))} keyboardType="phone-pad" />
            <Text style={s.inputLabel}>Fonte</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {FONTES.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[s.fonteChip, form.fonte === f && s.fonteChipAtivo]}
                    onPress={() => setForm((prev) => ({ ...prev, fonte: f }))}
                  >
                    <Text style={[s.fonteChipText, form.fonte === f && { color: "#ea580c" }]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={[s.btnCriar, criando && { opacity: 0.5 }]} onPress={handleCriar} disabled={criando}>
              {criando ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.btnCriarText}>Criar lead</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  titulo: { fontSize: 22, fontWeight: "700", color: "#1e3a5f", flex: 1 },
  btnNovo: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ea580c", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  btnNovoText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  tabsScroll: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", maxHeight: 48 },
  tabsContent: { paddingHorizontal: 12 },
  tab: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 14, gap: 6 },
  tabText: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  tabBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  tabBadgeText: { fontSize: 11, fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#f3f4f6" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  leadNome: { fontSize: 15, fontWeight: "600", color: "#111827" },
  leadMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  diasText: { fontSize: 11, color: "#9ca3af" },
  scoreBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  scoreNum: { fontSize: 13, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: "#9ca3af" },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sheetTitulo: { fontSize: 17, fontWeight: "700", color: "#111827" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, fontSize: 14, color: "#111827", marginBottom: 10 },
  inputLabel: { fontSize: 13, color: "#374151", fontWeight: "500", marginBottom: 8 },
  fonteChip: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  fonteChipAtivo: { borderColor: "#ea580c", backgroundColor: "#fff7ed" },
  fonteChipText: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  btnCriar: { backgroundColor: "#ea580c", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnCriarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
