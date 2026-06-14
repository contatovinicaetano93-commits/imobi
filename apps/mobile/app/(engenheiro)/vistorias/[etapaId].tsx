import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, StyleSheet, Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { vistoriaApi, type VistoriaDetalhe } from "../../../lib/api";

const { width } = Dimensions.get("window");
const FOTO_SIZE = (width - 48) / 3;

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function tempoAtras(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d atrás`;
  if (h > 0) return `${h}h atrás`;
  return "agora";
}

export default function VistoriaDetalheScreen() {
  const { etapaId } = useLocalSearchParams<{ etapaId: string }>();
  const router = useRouter();
  const [detalhe, setDetalhe] = useState<VistoriaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [fotoZoom, setFotoZoom] = useState<string | null>(null);
  const [modalReprovar, setModalReprovar] = useState(false);
  const [motivo, setMotivo] = useState("");

  const carregar = useCallback(async () => {
    try {
      const data = await vistoriaApi.obter(etapaId);
      setDetalhe(data);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar a vistoria.");
    } finally {
      setLoading(false);
    }
  }, [etapaId]);

  useEffect(() => { carregar(); }, []);

  const handleAprovar = () => {
    Alert.alert(
      "Confirmar aprovação",
      `Aprovar a etapa "${detalhe?.etapaNome}" e encaminhar para validação do gestor?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprovar",
          style: "default",
          onPress: async () => {
            setEnviando(true);
            try {
              await vistoriaApi.aprovar(etapaId);
              Alert.alert("Aprovado!", "Etapa aprovada. O gestor será notificado para validação final.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch {
              Alert.alert("Erro", "Não foi possível aprovar. Tente novamente.");
            } finally {
              setEnviando(false);
            }
          },
        },
      ],
    );
  };

  const handleReprovar = async () => {
    if (!motivo.trim()) {
      Alert.alert("Campo obrigatório", "Informe o motivo da reprovação.");
      return;
    }
    setEnviando(true);
    try {
      await vistoriaApi.rejeitar(etapaId, motivo.trim());
      setModalReprovar(false);
      Alert.alert("Reprovada", "O construtor será notificado.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Erro", "Não foi possível reprovar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  if (!detalhe) return null;

  const pendente = detalhe.status === "AGUARDANDO_VISTORIA";

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1e3a5f" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitulo} numberOfLines={1}>{detalhe.etapaNome}</Text>
          <Text style={s.headerSub} numberOfLines={1}>{detalhe.obraNome}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Info card */}
        <View style={s.infoCard}>
          <Row label="Endereço" value={detalhe.obraEndereco} />
          <Row label="Participação" value={`${detalhe.percentualObra}% da obra`} />
          <Row label="Valor da parcela" value={brl(detalhe.valorLiberacao)} destaque />
          <Row label="Aguardando desde" value={new Date(detalhe.aguardandoDesde).toLocaleDateString("pt-BR")} />
          <Row label="Raio da obra" value={`${detalhe.raioMetros} m`} />
        </View>

        {/* Evidências */}
        <Text style={s.sectionTitle}>
          Evidências ({detalhe.evidencias.length})
        </Text>

        {detalhe.evidencias.length === 0 ? (
          <View style={s.emptyEv}>
            <Ionicons name="images-outline" size={32} color="#d1d5db" />
            <Text style={s.emptyEvText}>Nenhuma foto enviada</Text>
          </View>
        ) : (
          <>
            {/* Grid de fotos */}
            <View style={s.fotoGrid}>
              {detalhe.evidencias.map((ev) => (
                <TouchableOpacity key={ev.evidenciaId} onPress={() => setFotoZoom(ev.fotoUrl)}>
                  <Image source={{ uri: ev.fotoUrl }} style={s.fotoThumb} />
                </TouchableOpacity>
              ))}
            </View>

            {/* GPS de cada evidência */}
            <Text style={s.sectionTitle}>Dados GPS</Text>
            {detalhe.evidencias.map((ev, i) => {
              const dentro = ev.distanciaObra !== null && ev.distanciaObra <= detalhe.raioMetros;
              return (
                <View key={ev.evidenciaId} style={s.gpsCard}>
                  <View style={s.gpsRow}>
                    <Text style={s.gpsLabel}>Foto {i + 1}</Text>
                    <Text style={s.gpsTempo}>{tempoAtras(ev.criadoEm)}</Text>
                    <View style={[s.gpsChip, { backgroundColor: dentro ? "#dcfce7" : "#fee2e2" }]}>
                      <Ionicons name={dentro ? "checkmark-circle" : "warning"} size={13} color={dentro ? "#16a34a" : "#ef4444"} />
                      <Text style={[s.gpsChipText, { color: dentro ? "#16a34a" : "#ef4444" }]}>
                        {dentro ? "Dentro do raio" : "Fora do raio"}
                      </Text>
                    </View>
                  </View>
                  <View style={s.gpsRow}>
                    <Text style={s.gpsMeta}>Lat: {ev.latCaptura.toFixed(6)}</Text>
                    <Text style={s.gpsMeta}>Lng: {ev.lngCaptura.toFixed(6)}</Text>
                  </View>
                  <View style={s.gpsRow}>
                    {ev.distanciaObra !== null && (
                      <Text style={s.gpsMeta}>Distância: {ev.distanciaObra.toFixed(0)} m</Text>
                    )}
                    {ev.accuracyMetros !== null && (
                      <Text style={s.gpsMeta}>Precisão: ±{ev.accuracyMetros?.toFixed(0)} m</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Ações fixas na base — só se AGUARDANDO_VISTORIA */}
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
            {enviando ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={s.btnAprovarText}>Aprovar Vistoria</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Modal: foto zoom */}
      <Modal visible={!!fotoZoom} transparent animationType="fade">
        <TouchableOpacity style={s.fotoModal} onPress={() => setFotoZoom(null)} activeOpacity={1}>
          {fotoZoom && <Image source={{ uri: fotoZoom }} style={s.fotoZoom} resizeMode="contain" />}
          <TouchableOpacity style={s.fotoModalClose} onPress={() => setFotoZoom(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal: reprovar */}
      <Modal visible={modalReprovar} transparent animationType="slide">
        <View style={s.reprovarOverlay}>
          <View style={s.reprovarSheet}>
            <Text style={s.reprovarTitulo}>Motivo da reprovação</Text>
            <TextInput
              style={s.reprovarInput}
              placeholder="Descreva o problema encontrado na vistoria..."
              placeholderTextColor="#9ca3af"
              value={motivo}
              onChangeText={setMotivo}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={s.reprovarAcoes}>
              <TouchableOpacity style={s.reprovarCancelar} onPress={() => { setModalReprovar(false); setMotivo(""); }}>
                <Text style={s.reprovarCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.reprovarConfirmar, enviando && s.btnDisabled]}
                onPress={handleReprovar}
                disabled={enviando}
              >
                {enviando ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.reprovarConfirmarText}>Confirmar reprovação</Text>}
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
      <Text style={[s.infoValue, destaque && s.infoValueDestaque]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 54, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", gap: 12 },
  backBtn: { padding: 4 },
  headerTitulo: { fontSize: 16, fontWeight: "700", color: "#1e3a5f" },
  headerSub: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  infoCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#f3f4f6" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  infoLabel: { fontSize: 13, color: "#6b7280" },
  infoValue: { fontSize: 13, color: "#111827", fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  infoValueDestaque: { color: "#2563eb", fontSize: 14, fontWeight: "700" },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 10, marginTop: 4 },
  fotoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 16 },
  fotoThumb: { width: FOTO_SIZE, height: FOTO_SIZE, borderRadius: 8, backgroundColor: "#e5e7eb" },
  gpsCard: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#f3f4f6", gap: 6 },
  gpsRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  gpsLabel: { fontSize: 13, fontWeight: "600", color: "#374151", flex: 1 },
  gpsTempo: { fontSize: 12, color: "#9ca3af" },
  gpsChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  gpsChipText: { fontSize: 12, fontWeight: "600" },
  gpsMeta: { fontSize: 12, color: "#6b7280" },
  emptyEv: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyEvText: { fontSize: 14, color: "#9ca3af" },
  acoes: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 10, padding: 16, paddingBottom: 32, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  btnReprovar: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1.5, borderColor: "#ef4444", paddingVertical: 14 },
  btnReprovarText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
  btnAprovar: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, backgroundColor: "#2563eb", paddingVertical: 14 },
  btnAprovarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  fotoModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  fotoZoom: { width: width, height: width },
  fotoModalClose: { position: "absolute", top: 52, right: 16, padding: 8 },
  reprovarOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  reprovarSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  reprovarTitulo: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  reprovarInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, fontSize: 14, color: "#111827", minHeight: 100, marginBottom: 16 },
  reprovarAcoes: { flexDirection: "row", gap: 10 },
  reprovarCancelar: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" },
  reprovarCancelarText: { color: "#374151", fontWeight: "600" },
  reprovarConfirmar: { flex: 2, paddingVertical: 13, borderRadius: 10, backgroundColor: "#ef4444", alignItems: "center" },
  reprovarConfirmarText: { color: "#fff", fontWeight: "700" },
});
