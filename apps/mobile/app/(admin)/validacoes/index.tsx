import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Platform, Alert, TextInput, Modal, ScrollView,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { adminApi, type EtapaValidacao } from "../../../lib/api";

const C = { blue: "#1B4FD8", navy: "#0C1A3D", mint: "#22C55E", amber: "#F59E0B", red: "#EF4444", ink: "#0F172A", gray: "#64748B", grayL: "#94A3B8", surface: "#F8FAFC", border: "#E2E8F0", white: "#FFFFFF" };

function formatarBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ValidacoesScreen() {
  const [etapas, setEtapas]   = useState<EtapaValidacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected]     = useState<EtapaValidacao | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await adminApi.listarEtapasAguardandoValidacao(50, 0);
      setEtapas(data.etapas ?? []);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar as validações.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); }, []);

  const abrirModal = (e: EtapaValidacao) => { setSelected(e); setMotivoRejeicao(""); setModalVisible(true); };

  const handleValidar = async () => {
    if (!selected) return;
    const valorStr = formatarBRL(selected.valorLiberacao);
    Alert.alert(
      "Confirmar liberação",
      `Validar a etapa "${selected.nome}"?\n\n💸 Isso irá liberar ${valorStr} para o construtor via BullMQ.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Liberar parcela",
          onPress: async () => {
            setSubmitting(true);
            try {
              await adminApi.validarEtapa(selected.etapaId);
              setModalVisible(false);
              carregar();
            } catch (e: any) {
              Alert.alert("Erro", e.message ?? "Não foi possível validar.");
            } finally { setSubmitting(false); }
          },
        },
      ]
    );
  };

  const handleRejeitar = async () => {
    if (!selected) return;
    if (!motivoRejeicao.trim()) { Alert.alert("Motivo obrigatório", "Informe o motivo."); return; }
    setSubmitting(true);
    try {
      await adminApi.rejeitarEtapa(selected.etapaId, motivoRejeicao.trim());
      setModalVisible(false);
      carregar();
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível rejeitar.");
    } finally { setSubmitting(false); }
  };

  const renderItem = ({ item }: { item: EtapaValidacao }) => (
    <TouchableOpacity style={styles.card} onPress={() => abrirModal(item)} activeOpacity={0.8}>
      <View style={styles.statusBar} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.etapaNome}>{item.nome}</Text>
            <Text style={styles.obraNome}>{item.obraNome}</Text>
          </View>
          <View style={styles.valorBadge}>
            <Text style={styles.valorText}>{formatarBRL(item.valorLiberacao)}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>👷 {item.construtor}</Text>
          <Text style={styles.metaText}>✅ Eng: {item.aprovadoPorEngenheiro}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>📊 {item.percentualObra}% da obra</Text>
          <Text style={styles.metaText}>📸 {item.totalEvidencias} evidência{item.totalEvidencias !== 1 ? "s" : ""}</Text>
        </View>
        <View style={[styles.actionHint]}>
          <Text style={{ fontSize: 12, color: C.blue, fontWeight: "600" }}>Toque para validar ou rejeitar →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 24, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: C.white }}>Validações</Text>
        <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
          {etapas.length > 0 ? `${etapas.length} etapa${etapas.length !== 1 ? "s" : ""} aguardando sua validação` : "Nenhuma validação pendente"}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.surface }}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      ) : etapas.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: C.surface }}>
          <Ionicons name="shield-checkmark" size={56} color={C.mint} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.ink }}>Tudo validado</Text>
          <Text style={{ fontSize: 14, color: C.gray }}>Sem etapas aguardando aprovação.</Text>
        </View>
      ) : (
        <FlatList
          data={etapas}
          keyExtractor={(i) => i.etapaId}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40, backgroundColor: C.surface }}
          onRefresh={() => { setRefreshing(true); carregar(); }}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: C.white }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: Platform.OS === "ios" ? 56 : 20 }}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, justifyContent: "center", alignItems: "center" }}>
              <Ionicons name="close" size={20} color={C.ink} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink }}>Validação Final</Text>
            <View style={{ width: 36 }} />
          </View>

          {selected && (
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
              {/* Summary card */}
              <View style={{ backgroundColor: C.navy, borderRadius: 16, padding: 18, gap: 8 }}>
                <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>PARCELA A LIBERAR</Text>
                <Text style={{ color: C.white, fontSize: 28, fontWeight: "800" }}>{formatarBRL(selected.valorLiberacao)}</Text>
                <Text style={{ color: "#94A3B8", fontSize: 12 }}>{selected.percentualObra}% do crédito aprovado de {formatarBRL(selected.valorAprovado)}</Text>
              </View>

              <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, gap: 2 }}>
                <InfoRow label="Obra"        value={selected.obraNome} />
                <InfoRow label="Construtor"  value={selected.construtor} />
                <InfoRow label="Etapa"       value={selected.nome} />
                <InfoRow label="Aprovado por engenheiro" value={selected.aprovadoPorEngenheiro} />
                <InfoRow label="Evidências"  value={`${selected.totalEvidencias} foto${selected.totalEvidencias !== 1 ? "s" : ""}`} />
              </View>

              <View style={{ backgroundColor: "#FEF3C7", borderRadius: 12, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <Ionicons name="warning" size={18} color="#92400E" />
                <Text style={{ fontSize: 13, color: "#92400E", flex: 1, lineHeight: 20 }}>
                  Ao validar, a parcela será liberada imediatamente via BullMQ. Esta ação não pode ser desfeita.
                </Text>
              </View>

              <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink }}>Motivo de rejeição (se reprovar)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 14, color: C.ink, minHeight: 80, backgroundColor: C.surface, textAlignVertical: "top" }}
                placeholder="Descreva o problema..."
                placeholderTextColor={C.grayL}
                multiline
                value={motivoRejeicao}
                onChangeText={setMotivoRejeicao}
                editable={!submitting}
              />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, borderWidth: 1.5, borderColor: C.red, borderRadius: 14, paddingVertical: 15, alignItems: "center", opacity: submitting ? 0.5 : 1 }}
                  onPress={handleRejeitar} disabled={submitting}
                >
                  <Text style={{ color: C.red, fontSize: 15, fontWeight: "700" }}>❌ Reprovar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1.4, backgroundColor: C.mint, borderRadius: 14, paddingVertical: 15, alignItems: "center", opacity: submitting ? 0.5 : 1 }}
                  onPress={handleValidar} disabled={submitting}
                >
                  {submitting ? <ActivityIndicator color={C.white} /> : <Text style={{ color: C.white, fontSize: 15, fontWeight: "700" }}>💸 Liberar parcela</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
      <Text style={{ fontSize: 13, color: "#64748B" }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: "#0F172A", maxWidth: "55%", textAlign: "right" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, flexDirection: "row", gap: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statusBar: { width: 4, borderRadius: 2, backgroundColor: "#F59E0B", alignSelf: "stretch" },
  cardTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  etapaNome: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  obraNome:  { fontSize: 12, color: "#64748B", marginTop: 2 },
  valorBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  valorText:  { fontSize: 12, color: "#166534", fontWeight: "700" },
  metaRow:    { flexDirection: "row", justifyContent: "space-between" },
  metaText:   { fontSize: 12, color: "#64748B" },
  actionHint: { borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 8, alignItems: "flex-end" },
});
