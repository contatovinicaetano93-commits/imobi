import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, StyleSheet, Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi, vistoriaApi, type VistoriaDetalhe } from "../../../lib/api";

const { width } = Dimensions.get("window");
const FOTO_SIZE = (width - 48) / 3;

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminValidarEtapaScreen() {
  const { etapaId } = useLocalSearchParams<{ etapaId: string }>();
  const router = useRouter();
  const [detalhe, setDetalhe] = useState<VistoriaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [fotoZoom, setFotoZoom] = useState<string | null>(null);
  const [modalReprovar, setModalReprovar] = useState(false);
  const [motivo, setMotivo] = useState("");

  useCallback(async () => {
    try {
      const data = await vistoriaApi.obter(etapaId);
      setDetalhe(data);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar os dados da etapa.");
    } finally {
      setLoading(false);
    }
  }, [etapaId]);

  useEffect(() => {
    (async () => {
      try {
        const data = await vistoriaApi.obter(etapaId);
        setDetalhe(data);
      } catch {
        Alert.alert("Erro", "Não foi possível carregar os dados da etapa.");
      } finally {
        setLoading(false);
      }
    })();
  }, [etapaId]);

  const handleAprovar = () => {
    Alert.alert(
      "Confirmar liberação",
      `Validar "${detalhe?.etapaNome}" e agendar a liberação de ${brl(detalhe?.valorLiberacao ?? 0)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Liberar parcela",
          onPress: async () => {
            setEnviando(true);
            try {
              await adminApi.validarEtapa(etapaId, true);
              Alert.alert("Parcela agendada!", "A etapa foi concluída e a liberação foi enfileirada.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch {
              Alert.alert("Erro", "Não foi possível concluir. Tente novamente.");
            } finally {
              setEnviando(false);
            }
          },
        },
      ],
    );
  };

  const handleReprovar = async () => {
    if (!motivo.trim()) { Alert.alert("Campo obrigatório", "Informe o motivo."); return; }
    setEnviando(true);
    try {
      await adminApi.validarEtapa(etapaId, false, motivo.trim());
      setModalReprovar(false);
      Alert.alert("Reprovada", "O construtor será notificado.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Erro", "Não foi possível reprovar.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#7c3aed" /></View>;
  if (!detalhe) return null;

  const pendente = detalhe.status === "APROVADA_ENGENHEIRO";

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color="#1e3a5f" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitulo} numberOfLines={1}>{detalhe.etapaNome}</Text>
          <Text style={s.headerSub} numberOfLines={1}>{detalhe.obraNome}</Text>
        </View>
        <View style={s.adminBadge}>
          <Ionicons name="shield-checkmark" size={13} color="#7c3aed" />
          <Text style={s.adminBadgeText}>Eng. aprovada</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={s.infoCard}>
          <Row label="Endereço" value={detalhe.obraEndereco} />
          <Row label="Participação" value={`${detalhe.percentualObra}% da obra`} />
          <Row label="Valor a liberar" value={brl(detalhe.valorLiberacao)} destaque />
          <Row label="Raio da obra" value={`${detalhe.raioMetros} m`} />
        </View>

        <Text style={s.sectionTitle}>Evidências do construtor ({detalhe.evidencias.length})</Text>
        {detalhe.evidencias.length === 0 ? (
          <Text style={s.empty}>Nenhuma foto enviada</Text>
        ) : (
          <>
            <View style={s.fotoGrid}>
              {detalhe.evidencias.map((ev) => (
                <TouchableOpacity key={ev.evidenciaId} onPress={() => setFotoZoom(ev.fotoUrl)}>
                  <Image source={{ uri: ev.fotoUrl }} style={s.fotoThumb} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.sectionTitle}>Validação GPS</Text>
            {detalhe.evidencias.map((ev, i) => {
              const dentro = ev.distanciaObra !== null && ev.distanciaObra <= detalhe.raioMetros;
              return (
                <View key={ev.evidenciaId} style={s.gpsCard}>
                  <View style={s.gpsRow}>
                    <Text style={s.gpsIdx}>Foto {i + 1}</Text>
                    <View style={[s.gpsChip, { backgroundColor: dentro ? "#dcfce7" : "#fee2e2" }]}>
                      <Ionicons name={dentro ? "checkmark-circle" : "warning"} size={13} color={dentro ? "#16a34a" : "#ef4444"} />
                      <Text style={[s.gpsChipText, { color: dentro ? "#16a34a" : "#ef4444" }]}>
                        {dentro ? "Dentro do raio" : "Fora do raio"}
                      </Text>
                    </View>
                    {ev.distanciaObra !== null && (
                      <Text style={s.gpsMeta}>{ev.distanciaObra.toFixed(0)} m</Text>
                    )}
                    {ev.accuracyMetros !== null && (
                      <Text style={s.gpsMeta}>±{ev.accuracyMetros?.toFixed(0)} m</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {pendente && (
        <View style={s.acoes}>
          <TouchableOpacity
            style={[s.btnReprovar, enviando && s.btnDisabled]}
            onPress={() => setModalReprovar(true)}
            disabled={enviando}
          >
            <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
            <Text style={s.btnReprovarText}>Reprovar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btnAprovar, enviando && s.btnDisabled]}
            onPress={handleAprovar}
            disabled={enviando}
          >
            {enviando
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="cash-outline" size={20} color="#fff" /><Text style={s.btnAprovarText}>Liberar parcela</Text></>
            }
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={!!fotoZoom} transparent animationType="fade">
        <TouchableOpacity style={s.fotoModal} onPress={() => setFotoZoom(null)} activeOpacity={1}>
          {fotoZoom && <Image source={{ uri: fotoZoom }} style={{ width, height: width }} resizeMode="contain" />}
          <TouchableOpacity style={s.fotoClose} onPress={() => setFotoZoom(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalReprovar} transparent animationType="slide">
        <View style={s.sheetOverlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitulo}>Motivo da reprovação</Text>
            <TextInput
              style={s.sheetInput}
              placeholder="Descreva o problema..."
              placeholderTextColor="#9ca3af"
              value={motivo}
              onChangeText={setMotivo}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={s.sheetAcoes}>
              <TouchableOpacity style={s.sheetCancelar} onPress={() => { setModalReprovar(false); setMotivo(""); }}>
                <Text style={{ color: "#374151", fontWeight: "600" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.sheetConfirmar, enviando && s.btnDisabled]} onPress={handleReprovar} disabled={enviando}>
                {enviando ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, destaque && { color: "#7c3aed", fontWeight: "700", fontSize: 15 }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 54, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", gap: 10 },
  headerTitulo: { fontSize: 16, fontWeight: "700", color: "#1e3a5f" },
  headerSub: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f3e8ff", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  adminBadgeText: { fontSize: 11, fontWeight: "600", color: "#7c3aed" },
  infoCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#f3f4f6" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  infoLabel: { fontSize: 13, color: "#6b7280" },
  infoValue: { fontSize: 13, color: "#111827", fontWeight: "500" },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 10, marginTop: 4 },
  fotoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 16 },
  fotoThumb: { width: FOTO_SIZE, height: FOTO_SIZE, borderRadius: 8, backgroundColor: "#e5e7eb" },
  gpsCard: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#f3f4f6" },
  gpsRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  gpsIdx: { fontSize: 13, fontWeight: "600", color: "#374151", flex: 1 },
  gpsChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  gpsChipText: { fontSize: 12, fontWeight: "600" },
  gpsMeta: { fontSize: 12, color: "#6b7280" },
  empty: { fontSize: 14, color: "#9ca3af", textAlign: "center", padding: 24 },
  acoes: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 10, padding: 16, paddingBottom: 32, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  btnReprovar: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1.5, borderColor: "#ef4444", paddingVertical: 14 },
  btnReprovarText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
  btnAprovar: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, backgroundColor: "#7c3aed", paddingVertical: 14 },
  btnAprovarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  fotoModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  fotoClose: { position: "absolute", top: 52, right: 16, padding: 8 },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitulo: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  sheetInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, fontSize: 14, color: "#111827", minHeight: 100, marginBottom: 16 },
  sheetAcoes: { flexDirection: "row", gap: 10 },
  sheetCancelar: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" },
  sheetConfirmar: { flex: 2, paddingVertical: 13, borderRadius: 10, backgroundColor: "#ef4444", alignItems: "center" },
});
