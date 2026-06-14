import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Platform, Alert, TextInput, Modal, ScrollView, Image,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { vistoriaApi, type EtapaVistoria } from "../../../lib/api";

const C = {
  blue: "#1B4FD8", navy: "#0C1A3D", mint: "#22C55E",
  ink: "#0F172A", gray: "#64748B", grayL: "#94A3B8",
  surface: "#F8FAFC", border: "#E2E8F0", white: "#FFFFFF",
  red: "#EF4444", amber: "#F59E0B",
};

function diasAtras(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const dias = Math.floor(diff / 86400000);
  if (dias === 0) return "hoje";
  if (dias === 1) return "1 dia";
  return `${dias} dias`;
}

function formatarBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VistoriasScreen() {
  const [etapas, setEtapas]   = useState<EtapaVistoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<EtapaVistoria | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await vistoriaApi.listarPendentes(50, 0);
      setEtapas(data.etapas ?? []);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar as vistorias.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); }, []);

  const abrirRevisao = (etapa: EtapaVistoria) => {
    setSelected(etapa);
    setMotivo("");
    setModalVisible(true);
  };

  const handleAprovar = async () => {
    if (!selected) return;
    Alert.alert(
      "Confirmar aprovação",
      `Aprovar a etapa "${selected.nome}"?\n\nEla irá para validação do Admin antes da parcela ser liberada.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprovar",
          style: "default",
          onPress: async () => {
            setSubmitting(true);
            try {
              await vistoriaApi.aprovar(selected.etapaId);
              setModalVisible(false);
              carregar();
            } catch (e: any) {
              Alert.alert("Erro", e.message ?? "Não foi possível aprovar.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleRejeitar = async () => {
    if (!selected) return;
    if (!motivo.trim()) {
      Alert.alert("Motivo obrigatório", "Informe o motivo da reprovação.");
      return;
    }
    setSubmitting(true);
    try {
      await vistoriaApi.rejeitar(selected.etapaId, motivo.trim());
      setModalVisible(false);
      carregar();
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível reprovar.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderEtapa = ({ item }: { item: EtapaVistoria }) => (
    <TouchableOpacity style={styles.card} onPress={() => abrirRevisao(item)} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.urgencyDot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardEtapa}>{item.nome}</Text>
          <Text style={styles.cardObra}>{item.obraNome}</Text>
        </View>
        <View style={styles.diasBadge}>
          <Text style={styles.diasText}>{diasAtras(item.evidencias?.[0]?.criadoEm ?? new Date().toISOString())}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <MetaChip icon="person-outline" label={item.construtor} />
        <MetaChip icon="camera-outline" label={`${item.totalEvidencias} foto${item.totalEvidencias !== 1 ? "s" : ""}`} />
        <MetaChip icon="cash-outline" label={formatarBRL(item.valorLiberacao)} color={C.mint} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.pctLabel}>{item.percentualObra}% da obra</Text>
        <View style={styles.reviewBtn}>
          <Text style={styles.reviewBtnText}>Revisar →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vistorias</Text>
        <Text style={styles.headerSub}>
          {etapas.length > 0 ? `${etapas.length} aguardando revisão` : "Tudo em dia"}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      ) : etapas.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle" size={56} color={C.mint} />
          <Text style={styles.emptyTitle}>Sem vistorias pendentes</Text>
          <Text style={styles.emptyText}>Todas as etapas foram revisadas.</Text>
        </View>
      ) : (
        <FlatList
          data={etapas}
          keyExtractor={(i) => i.etapaId}
          renderItem={renderEtapa}
          contentContainerStyle={styles.list}
          onRefresh={() => { setRefreshing(true); carregar(); }}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal de revisão */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={C.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selected?.nome}</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {selected && (
              <>
                <View style={styles.infoCard}>
                  <InfoRow label="Obra" value={selected.obraNome} />
                  <InfoRow label="Construtor" value={selected.construtor} />
                  <InfoRow label="Percentual da obra" value={`${selected.percentualObra}%`} />
                  <InfoRow label="Valor a liberar" value={formatarBRL(selected.valorLiberacao)} highlight />
                </View>

                <Text style={styles.sectionLabel}>Evidências ({selected.totalEvidencias})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {selected.evidencias.map((ev) => (
                    <View key={ev.evidenciaId} style={styles.evidenciaCard}>
                      <Image
                        source={{ uri: ev.fotoUrl }}
                        style={styles.evidenciaImg}
                        resizeMode="cover"
                      />
                      <Text style={styles.evidenciaGps}>
                        GPS: {ev.latCaptura.toFixed(5)}, {ev.lngCaptura.toFixed(5)}
                      </Text>
                      <Text style={styles.evidenciaData}>
                        {new Date(ev.criadoEm).toLocaleString("pt-BR")}
                      </Text>
                    </View>
                  ))}
                  {selected.evidencias.length === 0 && (
                    <Text style={{ color: C.gray, padding: 8 }}>Nenhuma foto enviada.</Text>
                  )}
                </ScrollView>

                <Text style={styles.sectionLabel}>Motivo de reprovação (opcional)</Text>
                <TextInput
                  style={styles.motivoInput}
                  placeholder="Descreva o problema se for reprovar..."
                  placeholderTextColor={C.grayL}
                  multiline
                  numberOfLines={3}
                  value={motivo}
                  onChangeText={setMotivo}
                  editable={!submitting}
                />

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.rejeitarBtn, submitting && { opacity: 0.5 }]}
                    onPress={handleRejeitar}
                    disabled={submitting}
                  >
                    {submitting ? <ActivityIndicator color={C.red} /> : <Text style={styles.rejeitarBtnText}>❌ Reprovar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.aprovarBtn, submitting && { opacity: 0.5 }]}
                    onPress={handleAprovar}
                    disabled={submitting}
                  >
                    {submitting ? <ActivityIndicator color={C.white} /> : <Text style={styles.aprovarBtnText}>✅ Aprovar</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function MetaChip({ icon, label, color }: { icon: any; label: string; color?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name={icon} size={13} color={color ?? C.gray} />
      <Text style={{ fontSize: 12, color: color ?? C.gray }}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <Text style={{ fontSize: 13, color: C.gray }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "700", color: highlight ? C.mint : C.ink }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.navy },
  header: { paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 24, paddingHorizontal: 20, backgroundColor: C.navy },
  headerTitle: { fontSize: 26, fontWeight: "800", color: C.white },
  headerSub:   { fontSize: 13, color: "#94A3B8", marginTop: 4 },
  list: { padding: 16, gap: 12, paddingBottom: 40, backgroundColor: C.surface },
  card: {
    backgroundColor: C.white, borderRadius: 18, padding: 18, gap: 12,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader:  { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  urgencyDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: C.amber, marginTop: 5 },
  cardEtapa:   { fontSize: 15, fontWeight: "700", color: C.ink },
  cardObra:    { fontSize: 12, color: C.gray, marginTop: 2 },
  diasBadge:   { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  diasText:    { fontSize: 11, color: "#92400E", fontWeight: "600" },
  cardMeta:    { flexDirection: "row", gap: 16 },
  cardFooter:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pctLabel:    { fontSize: 12, color: C.grayL },
  reviewBtn:   { backgroundColor: C.blue, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  reviewBtnText: { fontSize: 13, color: C.white, fontWeight: "700" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: C.surface },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.ink },
  emptyText:  { fontSize: 14, color: C.gray },
  // Modal
  modalRoot:    { flex: 1, backgroundColor: C.white },
  modalHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: Platform.OS === "ios" ? 56 : 20 },
  modalClose:   { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, justifyContent: "center", alignItems: "center" },
  modalTitle:   { fontSize: 17, fontWeight: "700", color: C.ink, flex: 1, textAlign: "center" },
  modalContent: { padding: 16, gap: 12, paddingBottom: 48 },
  infoCard:     { backgroundColor: C.surface, borderRadius: 14, padding: 16 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: C.ink, marginTop: 8 },
  evidenciaCard:  { marginRight: 12, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border, width: 200 },
  evidenciaImg:   { width: 200, height: 150 },
  evidenciaGps:   { fontSize: 10, color: C.gray, padding: 6 },
  evidenciaData:  { fontSize: 10, color: C.grayL, paddingHorizontal: 6, paddingBottom: 6 },
  motivoInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    padding: 12, fontSize: 14, color: C.ink, minHeight: 80,
    backgroundColor: C.surface, textAlignVertical: "top",
  },
  actionRow:      { flexDirection: "row", gap: 12, marginTop: 8 },
  rejeitarBtn:    { flex: 1, borderWidth: 1.5, borderColor: C.red, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  rejeitarBtnText: { color: C.red, fontSize: 15, fontWeight: "700" },
  aprovarBtn:     { flex: 1, backgroundColor: C.blue, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  aprovarBtnText: { color: C.white, fontSize: 15, fontWeight: "700" },
});
