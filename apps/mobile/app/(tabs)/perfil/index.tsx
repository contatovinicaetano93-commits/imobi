import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "@imbobi/core";

interface KycDocument {
  kycDocumentoId: string;
  tipo: string;
  url: string;
  status: "PENDENTE" | "APROVADO" | "REJEITADO";
  criadoEm: string;
  motivo_rejeicao?: string;
}

interface KycStatus {
  usuarioId: string;
  status: "NENHUM" | "ENVIADO" | "APROVADO" | "REJEITADO";
  documentos: KycDocument[];
  resumo: {
    pendentes: number;
    aprovados: number;
    rejeitados: number;
  };
}

export default function PerfilScreen() {
  const [usuario, setUsuario] = useState<{ nome: string; email: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const accessToken = await SecureStore.getItemAsync("accessToken");
      if (!accessToken) {
        Alert.alert("Erro", "Não autenticado");
        return;
      }
      setToken(accessToken);

      const usuarioJson = await SecureStore.getItemAsync("usuario");
      if (usuarioJson) {
        setUsuario(JSON.parse(usuarioJson));
      }

      await carregarKycStatus(accessToken);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarKycStatus = async (accessToken: string) => {
    try {
      const data = await apiClient.get<KycStatus>("/api/v1/kyc/status", accessToken);
      setKycStatus(data);
    } catch (error) {
      console.error("Erro ao carregar KYC:", error);
      Alert.alert("Erro", "Não foi possível carregar status KYC");
    }
  };

  const selecionarDocumento = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      await enviarDocumento(file);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível selecionar o arquivo");
    }
  };

  const enviarDocumento = async (file: any) => {
    try {
      setUploading(true);

      if (!token) {
        Alert.alert("Erro", "Não autenticado");
        return;
      }

      const tipoDocumento = selecionarTipoDocumento();
      if (!tipoDocumento) {
        Alert.alert("Erro", "Selecione um tipo de documento");
        return;
      }

      await apiClient.post(
        "/api/v1/kyc/upload",
        {
          tipo: tipoDocumento,
          url: file.uri,
        },
        token
      );

      Alert.alert("Sucesso", "Documento enviado com sucesso!");
      await carregarKycStatus(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao enviar documento";
      Alert.alert("Erro", message);
    } finally {
      setUploading(false);
    }
  };

  const selecionarTipoDocumento = (): string | null => {
    const tipos = ["RG", "CPF", "Comprovante de Renda", "Selfie"];
    return tipos[0];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APROVADO":
        return "#16a34a";
      case "PENDENTE":
        return "#f97316";
      case "REJEITADO":
        return "#dc2626";
      default:
        return "#6b7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "APROVADO":
        return "Aprovado";
      case "PENDENTE":
        return "Pendente";
      case "REJEITADO":
        return "Rejeitado";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.title}>Meu Perfil</Text>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{usuario?.nome}</Text>
          <Text style={styles.userEmail}>{usuario?.email}</Text>
        </View>
      </View>

      {/* Status KYC */}
      <View style={styles.kycCard}>
        <View style={styles.kycHeader}>
          <Text style={styles.sectionTitle}>Documentação (KYC)</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(kycStatus?.status || "NENHUM") },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(kycStatus?.status || "NENHUM")}</Text>
          </View>
        </View>

        {/* Resumo */}
        {kycStatus?.resumo && (
          <View style={styles.resumo}>
            <ResumoItem
              label="Pendentes"
              value={kycStatus.resumo.pendentes}
              color="#f97316"
            />
            <ResumoItem
              label="Aprovados"
              value={kycStatus.resumo.aprovados}
              color="#16a34a"
            />
            <ResumoItem
              label="Rejeitados"
              value={kycStatus.resumo.rejeitados}
              color="#dc2626"
            />
          </View>
        )}

        {/* Documentos */}
        {kycStatus?.documentos && kycStatus.documentos.length > 0 && (
          <View style={styles.documentosList}>
            <Text style={styles.subsectionTitle}>Documentos Enviados</Text>
            {kycStatus.documentos.map((doc) => (
              <View key={doc.kycDocumentoId} style={styles.documentoItem}>
                <View style={styles.documentoInfo}>
                  <Text style={styles.documentoTipo}>{doc.tipo}</Text>
                  <Text style={styles.documentoData}>
                    {new Date(doc.criadoEm).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.documentoStatus,
                    { backgroundColor: getStatusColor(doc.status) },
                  ]}
                >
                  <Text style={styles.documentoStatusText}>
                    {getStatusText(doc.status)}
                  </Text>
                </View>
              </View>
            ))}
            {kycStatus.documentos.some((d) => d.status === "REJEITADO") && (
              <View style={styles.motivo}>
                <Text style={styles.motivoLabel}>Motivo da rejeição:</Text>
                {kycStatus.documentos
                  .filter((d) => d.status === "REJEITADO")
                  .map((d) => (
                    <Text key={d.kycDocumentoId} style={styles.motivoText}>
                      {d.tipo}: {d.motivo_rejeicao}
                    </Text>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* Botão Upload */}
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={selecionarDocumento}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.uploadButtonText}>+ Enviar Documento</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Documentos Obrigatórios</Text>
        <Text style={styles.infoText}>• RG (frente e verso)</Text>
        <Text style={styles.infoText}>• Selfie segurando documento</Text>
        <Text style={styles.infoText}>• Comprovante de endereço</Text>
      </View>
    </ScrollView>
  );
}

function ResumoItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.resumoItem}>
      <View style={[styles.resumoColor, { backgroundColor: color }]} />
      <View>
        <Text style={styles.resumoLabel}>{label}</Text>
        <Text style={styles.resumoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 20, paddingTop: 56, gap: 16 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: { backgroundColor: "#fff", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 12 },
  userInfo: { gap: 4 },
  userName: { fontSize: 16, fontWeight: "600", color: "#374151" },
  userEmail: { fontSize: 14, color: "#9ca3af" },

  // KYC Card
  kycCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, gap: 16 },
  kycHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // Resumo
  resumo: { gap: 8 },
  resumoItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  resumoColor: { width: 4, height: 40, borderRadius: 2 },
  resumoLabel: { fontSize: 13, color: "#6b7280" },
  resumoValue: { fontSize: 20, fontWeight: "700", color: "#111827" },

  // Documentos
  documentosList: { gap: 12, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 16 },
  subsectionTitle: { fontSize: 14, fontWeight: "600", color: "#374151" },
  documentoItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  documentoInfo: { flex: 1 },
  documentoTipo: { fontSize: 14, fontWeight: "600", color: "#111827" },
  documentoData: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  documentoStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  documentoStatusText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  // Motivo
  motivo: { backgroundColor: "#fef2f2", borderRadius: 8, padding: 12, borderLeftWidth: 4, borderLeftColor: "#dc2626" },
  motivoLabel: { fontSize: 12, fontWeight: "600", color: "#991b1b" },
  motivoText: { fontSize: 12, color: "#7f1d1d", marginTop: 4 },

  // Upload Button
  uploadButton: { backgroundColor: "#16a34a", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  uploadButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Info Box
  infoBox: { backgroundColor: "#dbeafe", borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: "#3b82f6" },
  infoTitle: { fontSize: 14, fontWeight: "700", color: "#1e40af", marginBottom: 8 },
  infoText: { fontSize: 13, color: "#1e3a8a", marginVertical: 2 },
});
