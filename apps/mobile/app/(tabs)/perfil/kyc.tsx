import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { kycApi, type KycDocumento, type KycStatus } from "../../../lib/api";

const TIPOS_REQUERIDOS = ["RG", "Selfie"];

const STATUS_LABELS: Record<string, string> = {
  NENHUM: "Nenhum documento enviado",
  ENVIADO: "Em análise",
  APROVADO: "Identidade verificada",
  REJEITADO: "Documentação rejeitada",
};

const STATUS_COLORS: Record<string, string> = {
  NENHUM: "#6b7280",
  ENVIADO: "#d97706",
  APROVADO: "#16a34a",
  REJEITADO: "#dc2626",
};

export default function KycScreen() {
  const router = useRouter();
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const carregar = async () => {
    try {
      const data = await kycApi.obterStatus();
      setKycStatus(data);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar o status KYC.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleUpload = async (tipo: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos acessar sua galeria para enviar documentos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (result.canceled) return;

    setUploading(tipo);
    try {
      // In production, upload to S3 first and use the URL.
      // Here we send the local URI as placeholder — backend would handle S3 upload.
      const uri = result.assets[0].uri;
      await kycApi.uploadDocumento(tipo, uri);
      await carregar();
      Alert.alert("Enviado", `Documento "${tipo}" enviado. Aguarde a análise.`);
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível enviar o documento.");
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const statusGeral = kycStatus?.status ?? "NENHUM";

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Verificação de Identidade</Text>

      <View style={[styles.statusBanner, { backgroundColor: STATUS_COLORS[statusGeral] + "20" }]}>
        <Text style={[styles.statusLabel, { color: STATUS_COLORS[statusGeral] }]}>
          {STATUS_LABELS[statusGeral]}
        </Text>
        <Text style={styles.statusInfo}>
          {kycStatus?.resumo.aprovados ?? 0}/{TIPOS_REQUERIDOS.length} documentos aprovados
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Documentos necessários</Text>

      {TIPOS_REQUERIDOS.map((tipo) => {
        const doc = kycStatus?.documentos.find((d) => d.tipo === tipo);
        return (
          <DocumentoCard
            key={tipo}
            tipo={tipo}
            documento={doc ?? null}
            uploading={uploading === tipo}
            onUpload={() => handleUpload(tipo)}
          />
        );
      })}

      <Text style={styles.disclaimer}>
        Seus documentos são criptografados e armazenados com segurança conforme a LGPD.
      </Text>
    </ScrollView>
  );
}

function DocumentoCard({
  tipo, documento, uploading, onUpload,
}: {
  tipo: string;
  documento: KycDocumento | null;
  uploading: boolean;
  onUpload: () => void;
}) {
  const docStatus = documento?.status;

  return (
    <View style={styles.docCard}>
      <View style={styles.docInfo}>
        <Text style={styles.docTipo}>{tipo}</Text>
        {docStatus ? (
          <View style={[styles.docBadge, docStatus === "APROVADO" ? styles.badgeOk : docStatus === "REJEITADO" ? styles.badgeErr : styles.badgeWait]}>
            <Text style={[styles.docBadgeText, docStatus === "APROVADO" ? styles.badgeTextOk : docStatus === "REJEITADO" ? styles.badgeTextErr : styles.badgeTextWait]}>
              {docStatus === "APROVADO" ? "Aprovado" : docStatus === "REJEITADO" ? "Rejeitado" : "Em análise"}
            </Text>
          </View>
        ) : (
          <View style={styles.docBadge}>
            <Text style={[styles.docBadgeText, { color: "#9ca3af" }]}>Não enviado</Text>
          </View>
        )}
      </View>

      {documento?.motivo_rejeicao && (
        <Text style={styles.rejeicao}>Motivo: {documento.motivo_rejeicao}</Text>
      )}

      {docStatus !== "APROVADO" && (
        <TouchableOpacity
          style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
          onPress={onUpload}
          disabled={uploading}
        >
          {uploading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.uploadBtnText}>{documento ? "Reenviar" : "Enviar"}</Text>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, paddingBottom: 40, gap: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { marginBottom: 4 },
  backText: { color: "#16a34a", fontSize: 15, fontWeight: "600" },
  titulo: { fontSize: 22, fontWeight: "700", color: "#111827" },
  statusBanner: { borderRadius: 14, padding: 16, gap: 4 },
  statusLabel: { fontSize: 16, fontWeight: "700" },
  statusInfo: { fontSize: 13, color: "#4b5563" },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginTop: 4 },
  docCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, gap: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  docInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  docTipo: { fontSize: 16, fontWeight: "600", color: "#111827" },
  docBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: "#f3f4f6" },
  badgeOk: { backgroundColor: "#dcfce7" },
  badgeErr: { backgroundColor: "#fee2e2" },
  badgeWait: { backgroundColor: "#fef9c3" },
  docBadgeText: { fontSize: 12, fontWeight: "600" },
  badgeTextOk: { color: "#166534" },
  badgeTextErr: { color: "#991b1b" },
  badgeTextWait: { color: "#92400e" },
  rejeicao: { fontSize: 13, color: "#dc2626" },
  uploadBtn: { backgroundColor: "#16a34a", borderRadius: 10, padding: 12, alignItems: "center" },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  disclaimer: { fontSize: 12, color: "#9ca3af", textAlign: "center", lineHeight: 18 },
});
