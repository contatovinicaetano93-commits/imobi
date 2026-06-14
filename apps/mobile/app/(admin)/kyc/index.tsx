import {
  View, Text, FlatList, TouchableOpacity, Image,
  ActivityIndicator, StatusBar, Platform, Alert, TextInput, Modal, ScrollView,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { adminKycApi, type KycPendente } from "../../../lib/api";

const C = {
  blue: "#1B4FD8", navy: "#0C1A3D", mint: "#22C55E", red: "#EF4444",
  ink: "#0F172A", gray: "#64748B", grayL: "#94A3B8", surface: "#F8FAFC",
  border: "#E2E8F0", white: "#FFFFFF", amber: "#F59E0B",
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatarCpf(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export default function AdminKycScreen() {
  const [docs, setDocs] = useState<KycPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<KycPendente | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await adminKycApi.listarPendentes();
      setDocs(data ?? []);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar documentos KYC.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); }, []);

  const abrirModal = (doc: KycPendente) => {
    setSelected(doc);
    setMotivo("");
    setModalVisible(true);
  };

  const handleAprovar = async () => {
    if (!selected) return;
    Alert.alert(
      "Aprovar documento",
      `Aprovar o ${selected.tipo} de ${selected.usuario.nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprovar",
          onPress: async () => {
            setSubmitting(true);
            try {
              await adminKycApi.aprovar(selected.kycDocumentoId);
              setModalVisible(false);
              carregar();
            } catch (e: any) {
              Alert.alert("Erro", e.message ?? "Não foi possível aprovar.");
            } finally { setSubmitting(false); }
          },
        },
      ]
    );
  };

  const handleRejeitar = async () => {
    if (!selected) return;
    if (!motivo.trim()) { Alert.alert("Campo obrigatório", "Informe o motivo da rejeição."); return; }
    setSubmitting(true);
    try {
      await adminKycApi.rejeitar(selected.kycDocumentoId, motivo.trim());
      setModalVisible(false);
      carregar();
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível rejeitar.");
    } finally { setSubmitting(false); }
  };

  const renderItem = ({ item }: { item: KycPendente }) => (
    <TouchableOpacity style={styles.card} onPress={() => abrirModal(item)} activeOpacity={0.8}>
      <View style={styles.iconBox}>
        <Ionicons name="id-card" size={24} color={C.blue} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.tipoText}>{item.tipo}</Text>
          <View style={styles.pendenteBadge}>
            <Text style={styles.pendenteText}>PENDENTE</Text>
          </View>
        </View>
        <Text style={styles.nomeText}>{item.usuario.nome}</Text>
        <Text style={styles.metaText}>CPF: {formatarCpf(item.usuario.cpf)}</Text>
        <Text style={styles.metaText}>Enviado em {formatarData(item.criadoEm)}</Text>
        <Text style={{ fontSize: 12, color: C.blue, fontWeight: "600", marginTop: 4 }}>
          Toque para revisar →
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 24, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: C.white }}>KYC</Text>
        <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
          {docs.length > 0
            ? `${docs.length} documento${docs.length !== 1 ? "s" : ""} aguardando revisão`
            : "Nenhum documento pendente"}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.surface }}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      ) : docs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: C.surface }}>
          <Ionicons name="checkmark-circle" size={56} color={C.mint} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.ink }}>Tudo em dia</Text>
          <Text style={{ fontSize: 14, color: C.gray }}>Sem documentos KYC pendentes.</Text>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(i) => i.kycDocumentoId}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40, backgroundColor: C.surface }}
          onRefresh={() => { setRefreshing(true); carregar(); }}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: C.white }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: Platform.OS === "ios" ? 56 : 20 }}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, justifyContent: "center", alignItems: "center" }}>
              <Ionicons name="close" size={20} color={C.ink} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink }}>Revisão de Documento</Text>
            <View style={{ width: 36 }} />
          </View>

          {selected && (
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
              {/* Document image */}
              <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: C.surface, aspectRatio: 16 / 9 }}>
                <Image
                  source={{ uri: selected.url }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </View>

              {/* User info */}
              <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, gap: 2 }}>
                <InfoRow label="Tipo"    value={selected.tipo} />
                <InfoRow label="Nome"    value={selected.usuario.nome} />
                <InfoRow label="Email"   value={selected.usuario.email} />
                <InfoRow label="CPF"     value={formatarCpf(selected.usuario.cpf)} />
                <InfoRow label="Enviado" value={formatarData(selected.criadoEm)} />
              </View>

              {/* Rejection reason */}
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink }}>Motivo de rejeição (se reprovar)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 14, color: C.ink, minHeight: 80, backgroundColor: C.surface, textAlignVertical: "top" }}
                placeholder="Descreva o problema com o documento..."
                placeholderTextColor={C.grayL}
                multiline
                value={motivo}
                onChangeText={setMotivo}
                editable={!submitting}
              />

              {/* Actions */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, borderWidth: 1.5, borderColor: C.red, borderRadius: 14, paddingVertical: 15, alignItems: "center", opacity: submitting ? 0.5 : 1 }}
                  onPress={handleRejeitar}
                  disabled={submitting}
                >
                  <Text style={{ color: C.red, fontSize: 15, fontWeight: "700" }}>❌ Reprovar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1.4, backgroundColor: C.mint, borderRadius: 14, paddingVertical: 15, alignItems: "center", opacity: submitting ? 0.5 : 1 }}
                  onPress={handleAprovar}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator color={C.white} />
                    : <Text style={{ color: C.white, fontSize: 15, fontWeight: "700" }}>✅ Aprovar</Text>}
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
      <Text style={{ fontSize: 13, color: C.gray }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink, maxWidth: "60%", textAlign: "right" }}>{value}</Text>
    </View>
  );
}

const styles = {
  card: { backgroundColor: C.white, borderRadius: 18, padding: 18, flexDirection: "row" as const, gap: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#EFF6FF", justifyContent: "center" as const, alignItems: "center" as const },
  tipoText: { fontSize: 15, fontWeight: "700" as const, color: C.ink },
  nomeText: { fontSize: 13, color: C.ink, fontWeight: "600" as const },
  metaText: { fontSize: 12, color: C.gray },
  pendenteBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pendenteText: { fontSize: 10, fontWeight: "700" as const, color: "#92400E", letterSpacing: 0.5 },
};
