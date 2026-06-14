import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { kycApi, type KycDocumento } from "../../../lib/api";

export default function KycScreen() {
  const [docs, setDocs] = useState<KycDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rejeicaoId, setRejeicaoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await kycApi.listarPendentes();
      setDocs(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar fila KYC");
    }
  }, []);

  useEffect(() => {
    carregar().finally(() => setLoading(false));
  }, [carregar]);

  const onRefresh = async () => {
    setRefreshing(true);
    await carregar();
    setRefreshing(false);
  };

  const aprovar = (doc: KycDocumento) => {
    Alert.alert(
      "Aprovar documento",
      `Aprovar "${doc.tipo}" de ${doc.usuario.nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprovar",
          onPress: async () => {
            try {
              await kycApi.aprovar(doc.kycDocumentoId);
              setDocs((prev) => prev.filter((d) => d.kycDocumentoId !== doc.kycDocumentoId));
            } catch (e: any) {
              Alert.alert("Erro", e.message ?? "Falha ao aprovar.");
            }
          },
        },
      ]
    );
  };

  const abrirRejeicao = (id: string) => {
    setMotivo("");
    setRejeicaoId(id);
  };

  const confirmarRejeicao = async () => {
    if (!motivo.trim()) {
      Alert.alert("Atenção", "Informe o motivo da rejeição.");
      return;
    }
    setSalvando(true);
    try {
      await kycApi.rejeitar(rejeicaoId!, motivo.trim());
      setDocs((prev) => prev.filter((d) => d.kycDocumentoId !== rejeicaoId));
      setRejeicaoId(null);
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Falha ao rejeitar.");
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fila KYC</Text>
      <Text style={styles.sub}>{docs.length} documento{docs.length !== 1 ? "s" : ""} pendente{docs.length !== 1 ? "s" : ""}</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={docs}
        keyExtractor={(d) => d.kycDocumentoId}
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={52} color="#d1d5db" />
            <Text style={styles.emptyText}>Fila vazia. Nenhum documento pendente.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.tipoTag}>
                <Text style={styles.tipoText}>{item.tipo}</Text>
              </View>
              <Text style={styles.data}>{new Date(item.criadoEm).toLocaleDateString("pt-BR")}</Text>
            </View>

            <Text style={styles.nome}>{item.usuario.nome}</Text>
            <Text style={styles.cpf}>CPF: {item.usuario.cpf}</Text>
            <Text style={styles.email}>{item.usuario.email}</Text>

            <View style={styles.acoes}>
              <TouchableOpacity style={styles.btnAprovar} onPress={() => aprovar(item)}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.btnAprovarText}>Aprovar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnRejeitar} onPress={() => abrirRejeicao(item.kycDocumentoId)}>
                <Ionicons name="close" size={16} color="#dc2626" />
                <Text style={styles.btnRejeitarText}>Rejeitar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={rejeicaoId !== null} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Motivo da rejeição</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Descreva o motivo..."
              multiline
              numberOfLines={4}
              value={motivo}
              onChangeText={setMotivo}
              editable={!salvando}
            />
            <View style={styles.modalAcoes}>
              <TouchableOpacity style={styles.modalCancelar} onPress={() => setRejeicaoId(null)} disabled={salvando}>
                <Text style={styles.modalCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmar, salvando && { opacity: 0.5 }]} onPress={confirmarRejeicao} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmarText}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", paddingTop: 56, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  sub: { fontSize: 13, color: "#6b7280", marginTop: 2, marginBottom: 16 },
  error: { color: "#dc2626", fontSize: 14, marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 64, gap: 12 },
  emptyText: { color: "#9ca3af", fontSize: 14, textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 6, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tipoTag: { backgroundColor: "#ede9fe", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  tipoText: { fontSize: 12, fontWeight: "600", color: "#7c3aed" },
  data: { fontSize: 12, color: "#9ca3af" },
  nome: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 4 },
  cpf: { fontSize: 13, color: "#6b7280" },
  email: { fontSize: 13, color: "#6b7280" },
  acoes: { flexDirection: "row", gap: 10, marginTop: 12 },
  btnAprovar: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#16a34a", borderRadius: 12, paddingVertical: 10 },
  btnAprovarText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  btnRejeitar: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#fee2e2", borderRadius: 12, paddingVertical: 10 },
  btnRejeitarText: { color: "#dc2626", fontWeight: "600", fontSize: 14 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalInput: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, fontSize: 14, color: "#111827", textAlignVertical: "top", minHeight: 100 },
  modalAcoes: { flexDirection: "row", gap: 12 },
  modalCancelar: { flex: 1, borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalCancelarText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  modalConfirmar: { flex: 1, backgroundColor: "#dc2626", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalConfirmarText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});
