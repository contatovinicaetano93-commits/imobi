import { useCallback, useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, ActionSheetIOS, Platform, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import ScreenHeader from "../../../components/ScreenHeader";
import { kycApi, type KycDocumento, type KycStatus } from "../../../lib/api";

const DOCS_OBRIGATORIOS = [
  { tipo: "RG", label: "RG (Identidade)", desc: "Documento de identidade com foto" },
  { tipo: "CPF", label: "CPF", desc: "Comprovante ou número do CPF" },
  { tipo: "Selfie", label: "Selfie com documento", desc: "Validação facial ao lado do RG" },
  { tipo: "Comprovante de Residência", label: "Comprovante de residência", desc: "Conta de luz, água ou telefone (90 dias)" },
  { tipo: "CNPJ", label: "CNPJ da construtora", desc: "Cartão CNPJ ou contrato social da empresa" },
] as const;

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  APROVADO:  { label: "Aprovado",  color: "#166534", bg: "#DCFCE7", icon: "checkmark-circle" },
  PENDENTE:  { label: "Em análise", color: "#92400E", bg: "#FEF9C3", icon: "time" },
  REJEITADO: { label: "Rejeitado", color: "#991B1B", bg: "#FEE2E2", icon: "close-circle" },
  AUSENTE:   { label: "Pendente envio", color: "#64748B", bg: "#F1F5F9", icon: "ellipse-outline" },
};

export default function DocumentosScreen() {
  const [documentos, setDocumentos] = useState<KycDocumento[]>([]);
  const [statusKyc, setStatusKyc] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [docs, status] = await Promise.all([
        kycApi.listarDocumentos(),
        kycApi.obterStatus().catch(() => null),
      ]);
      setDocumentos(docs);
      setStatusKyc(status);
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível carregar documentos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const docPorTipo = (tipo: string) =>
    documentos.find((d) => d.tipo.toLowerCase() === tipo.toLowerCase());

  const statusItem = (tipo: string) => {
    const doc = docPorTipo(tipo);
    if (!doc) return STATUS_CFG.AUSENTE!;
    return STATUS_CFG[doc.status] ?? STATUS_CFG.PENDENTE!;
  };

  const enviar = async (tipo: string, uri: string, mime: string, fileName?: string) => {
    setUploading(tipo);
    try {
      const doc = await kycApi.uploadArquivo(tipo, uri, mime, fileName);
      setDocumentos((prev) => [doc, ...prev.filter((d) => d.tipo !== tipo)]);
      Alert.alert("Enviado", `"${tipo}" enviado para validação do comitê.`);
      carregar();
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Falha no envio.");
    } finally {
      setUploading(null);
    }
  };

  const pickArquivo = async (tipo: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await enviar(tipo, asset.uri, asset.mimeType ?? "application/pdf", asset.name);
  };

  const abrirEnvio = (tipo: string) => {
    const opcoes = ["Câmera", "Galeria", "Arquivo", "Cancelar"];
    const onSelect = async (idx: number) => {
      if (idx === 3 || idx < 0) return;
      if (idx === 2) {
        await pickArquivo(tipo);
        return;
      }
      const usarCamera = idx === 0;
      const perm = usarCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permissão", "Permita acesso à câmera ou galeria.");
        return;
      }
      const result = usarCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.85 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (!result.canceled && result.assets[0]) {
        await enviar(tipo, result.assets[0].uri, result.assets[0].mimeType ?? "image/jpeg");
      }
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: opcoes, cancelButtonIndex: 3, title: `Enviar: ${tipo}` },
        onSelect
      );
    } else {
      Alert.alert(`Enviar: ${tipo}`, "Escolha a origem:", [
        { text: "Câmera", onPress: () => onSelect(0) },
        { text: "Galeria", onPress: () => onSelect(1) },
        { text: "Arquivo", onPress: () => onSelect(2) },
        { text: "Cancelar", style: "cancel" },
      ]);
    }
  };

  const aprovados = DOCS_OBRIGATORIOS.filter((d) => docPorTipo(d.tipo)?.status === "APROVADO").length;
  const progresso = Math.round((aprovados / DOCS_OBRIGATORIOS.length) * 100);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1B4FD8" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Documentos" subtitle="Checklist do construtor" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} />}
      >
        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <Text style={styles.summaryTitle}>Validação KYC</Text>
            <Text style={styles.summaryPct}>{progresso}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progresso}%` }]} />
          </View>
          <Text style={styles.summarySub}>
            {statusKyc?.status === "APROVADO"
              ? "Documentação aprovada — crédito liberado para análise"
              : `${aprovados} de ${DOCS_OBRIGATORIOS.length} documentos aprovados pelo comitê`}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Documentos obrigatórios</Text>

        {DOCS_OBRIGATORIOS.map((item) => {
          const cfg = statusItem(item.tipo);
          const doc = docPorTipo(item.tipo);
          const busy = uploading === item.tipo;

          return (
            <View key={item.tipo} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.label}</Text>
                  <Text style={styles.cardDesc}>{item.desc}</Text>
                  <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  {doc?.motivo_rejeicao ? (
                    <Text style={styles.rejeicao}>Motivo: {doc.motivo_rejeicao}</Text>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.enviarBtn, busy && styles.btnDisabled]}
                onPress={() => abrirEnvio(item.tipo)}
                disabled={!!uploading}
              >
                {busy
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.enviarBtnText}>
                      {doc ? "Reenviar documento" : "Enviar documento"}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  summary: {
    backgroundColor: "#fff", borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  summaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  summaryPct: { fontSize: 20, fontWeight: "800", color: "#1B4FD8" },
  track: { height: 8, backgroundColor: "#E2E8F0", borderRadius: 4, marginTop: 12, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: "#22C55E", borderRadius: 4 },
  summarySub: { fontSize: 13, color: "#64748B", marginTop: 10, lineHeight: 18 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#64748B", marginTop: 8 },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#E2E8F0", gap: 12,
  },
  cardRow: { flexDirection: "row", gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  cardDesc: { fontSize: 12, color: "#64748B", lineHeight: 17 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  rejeicao: { fontSize: 12, color: "#EF4444", marginTop: 4 },
  enviarBtn: { backgroundColor: "#1B4FD8", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  enviarBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  btnDisabled: { opacity: 0.55 },
});
