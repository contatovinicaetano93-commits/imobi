import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, ActionSheetIOS, Platform,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import { usuariosApi, authApi, kycApi, type UsuarioPerfil, type KycDocumento } from "../../../lib/api";

const TIPOS_KYC = ["RG", "CPF", "Selfie", "Comprovante de Residência", "CNPJ"];

const DOC_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  PENDENTE:  { label: "Pendente",  bg: "#fef9c3", color: "#92400e" },
  APROVADO:  { label: "Aprovado",  bg: "#dcfce7", color: "#166534" },
  REJEITADO: { label: "Rejeitado", bg: "#fee2e2", color: "#991b1b" },
};

export default function PerfilScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [documentos, setDocumentos] = useState<KycDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploading, setUploading] = useState(false);

  const carregarDados = async () => {
    try {
      const [perfil, docs] = await Promise.all([
        usuariosApi.obterPerfil(),
        kycApi.listarDocumentos().catch(() => [] as KycDocumento[]),
      ]);
      setUsuario(perfil);
      setDocumentos(docs);
    } catch (e) {
      console.error("Erro ao carregar perfil:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleLogout = async () => {
    Alert.alert("Sair", "Tem certeza que deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          try {
            const refreshToken = await SecureStore.getItemAsync("refreshToken");
            if (refreshToken) await authApi.logout(refreshToken);
          } catch { /* ignore */ } finally {
            await SecureStore.deleteItemAsync("accessToken");
            await SecureStore.deleteItemAsync("refreshToken");
            router.replace("/(auth)/login");
          }
        },
      },
    ]);
  };

  const escolherTipoDocumento = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...TIPOS_KYC, "Cancelar"], cancelButtonIndex: TIPOS_KYC.length, title: "Tipo de documento" },
        (idx) => { if (idx < TIPOS_KYC.length) abrirCamera(TIPOS_KYC[idx]!); }
      );
    } else {
      Alert.alert("Tipo de documento", "Escolha o tipo:", [
        ...TIPOS_KYC.map((tipo) => ({ text: tipo, onPress: () => abrirCamera(tipo) })),
        { text: "Cancelar", style: "cancel" },
      ]);
    }
  };

  const abrirCamera = async (tipo: string) => {
    Alert.alert("Enviar documento", `Tipo: ${tipo}`, [
      {
        text: "Câmera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permissão necessária", "Permita o acesso à câmera nas configurações.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!result.canceled && result.assets[0]) {
            await enviarDocumento(tipo, result.assets[0].uri, result.assets[0].mimeType ?? "image/jpeg");
          }
        },
      },
      {
        text: "Galeria",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permissão necessária", "Permita o acesso à galeria nas configurações.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await enviarDocumento(tipo, result.assets[0].uri, result.assets[0].mimeType ?? "image/jpeg");
          }
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const enviarDocumento = async (tipo: string, uri: string, mimeType: string) => {
    setUploading(true);
    try {
      const doc = await kycApi.uploadArquivo(tipo, uri, mimeType);
      setDocumentos((prev) => [doc, ...prev]);
      Alert.alert("Enviado!", `Documento "${tipo}" enviado para análise.`);
    } catch (e: any) {
      Alert.alert("Erro no envio", e.message ?? "Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const kycBadge =
    usuario?.kycStatus === "APROVADO"   ? { label: "Aprovado",    bg: "#dcfce7", color: "#166534" }
    : usuario?.kycStatus === "REJEITADO" ? { label: "Rejeitado",   bg: "#fee2e2", color: "#991b1b" }
    : usuario?.kycStatus === "ENVIADO"   ? { label: "Em análise",  bg: "#dbeafe", color: "#1d4ed8" }
    :                                       { label: "Pendente",    bg: "#f3f4f6", color: "#6b7280" };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Meu Perfil</Text>

      {usuario && (
        <>
          {/* Avatar card */}
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{usuario.nome.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{usuario.nome}</Text>
            <Text style={styles.email}>{usuario.email}</Text>
          </View>

          {/* Dados pessoais */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações Pessoais</Text>
            <InfoRow label="CPF" value={usuario.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")} />
            <InfoRow label="Telefone" value={usuario.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3")} />
            <InfoRow label="Perfil" value={usuario.tipo} />
          </View>

          {/* Verificação KYC */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Verificação de Identidade</Text>
              <View style={[styles.badge, { backgroundColor: kycBadge.bg }]}>
                <Text style={[styles.badgeText, { color: kycBadge.color }]}>{kycBadge.label}</Text>
              </View>
            </View>

            {/* Lista de documentos enviados */}
            {documentos.length > 0 && (
              <View style={styles.docList}>
                {documentos.map((doc) => {
                  const meta = DOC_STATUS[doc.status] ?? DOC_STATUS["PENDENTE"]!;
                  return (
                    <View key={doc.kycDocumentoId} style={styles.docRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docTipo}>{doc.tipo}</Text>
                        {doc.motivo_rejeicao && (
                          <Text style={styles.docMotivo}>Motivo: {doc.motivo_rejeicao}</Text>
                        )}
                      </View>
                      <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Botão enviar novo doc */}
            <TouchableOpacity
              style={[styles.uploadBtn, uploading && styles.btnDisabled]}
              onPress={escolherTipoDocumento}
              disabled={uploading}
            >
              {uploading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.uploadBtnText}>
                    {documentos.length === 0 ? "Enviar Documentos" : "Enviar Novo Documento"}
                  </Text>
              }
            </TouchableOpacity>

            {documentos.length === 0 && (
              <Text style={styles.kycHint}>
                Envie seu RG e uma Selfie para liberar o acesso ao crédito
              </Text>
            )}
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
            <Text style={styles.logoutBtnText}>{loggingOut ? "Saindo..." : "Sair da Conta"}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, paddingBottom: 40, gap: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, gap: 4,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#16a34a", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  avatarText: { fontSize: 32, fontWeight: "700", color: "#fff" },
  name: { fontSize: 20, fontWeight: "700", color: "#111827" },
  email: { fontSize: 14, color: "#6b7280" },
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  infoRow: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  label: { fontSize: 14, color: "#6b7280" },
  value: { fontSize: 14, fontWeight: "600", color: "#111827" },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  docList: { backgroundColor: "#fff", borderRadius: 12, overflow: "hidden" },
  docRow: {
    flexDirection: "row", alignItems: "center", padding: 14,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6", gap: 8,
  },
  docTipo: { fontSize: 14, fontWeight: "600", color: "#111827" },
  docMotivo: { fontSize: 12, color: "#ef4444", marginTop: 2 },
  uploadBtn: {
    backgroundColor: "#16a34a", borderRadius: 14, padding: 15,
    alignItems: "center", justifyContent: "center", height: 50,
  },
  btnDisabled: { opacity: 0.5 },
  uploadBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  kycHint: { fontSize: 12, color: "#9ca3af", textAlign: "center" },
  logoutBtn: { backgroundColor: "#ef4444", borderRadius: 14, padding: 16, alignItems: "center" },
  logoutBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
