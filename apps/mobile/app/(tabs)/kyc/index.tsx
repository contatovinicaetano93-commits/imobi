import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { apiClient, ApiError } from "@imbobi/core";

type DocumentType = "rg" | "cpf" | "selfie" | "comprovante_residencia";

type DocumentUploadStatus = {
  [key in DocumentType]?: {
    uploaded: boolean;
    fileName?: string;
  };
};

type UserProfile = {
  usuarioId: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  tipo: string;
  kycStatus: string;
  saldo_credito?: number;
  criadoEm: string;
};

const DOCUMENT_LABELS: { [key in DocumentType]: string } = {
  rg: "RG / CNH",
  cpf: "CPF",
  selfie: "Selfie (Foto sua)",
  comprovante_residencia: "Comprovante de Residência",
};

const DOCUMENT_HINTS: { [key in DocumentType]: string } = {
  rg: "Tire uma foto do seu documento RG ou CNH",
  cpf: "Pode ser a frente do CPF ou foto da carteira",
  selfie: "Fotografia seu rosto com boa iluminação",
  comprovante_residencia: "Conta de água, luz ou contrato de aluguel",
};

export default function KYCScreen() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [uploads, setUploads] = useState<DocumentUploadStatus>({});
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (token) {
        const data = await apiClient.get<UserProfile>("/api/v1/usuarios/me", token);
        setUser(data);
      }
    } catch (e: any) {
      console.error("Erro ao carregar perfil:", e);
      Alert.alert("Erro", "Falha ao carregar dados do usuário");
    } finally {
      setLoadingProfile(false);
    }
  };

  const requestGalleryPermission = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permissão Necessária",
          "Necessário acesso à galeria para selecionar documentos. Por favor, configure isso nas configurações do seu telefone."
        );
        return false;
      }
      return true;
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao solicitar permissão: " + e.message);
      return false;
    }
  };

  const requestCameraPermission = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permissão Necessária",
          "Necessário acesso à câmera para fotografar documentos. Por favor, configure isso nas configurações do seu telefone."
        );
        return false;
      }
      return true;
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao solicitar permissão: " + e.message);
      return false;
    }
  };

  const pickImageFromGallery = async (docType: DocumentType) => {
    try {
      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(docType, result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao acessar galeria: " + e.message);
    }
  };

  const pickImageFromCamera = async (docType: DocumentType) => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(docType, result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao acessar câmera: " + e.message);
    }
  };

  const uploadDocument = async (docType: DocumentType, uri: string) => {
    setUploading(true);
    setSelectedDocument(docType);
    setUploadProgress(0);

    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (!token) throw new Error("Token não encontrado");

      const fileName = uri.split("/").pop() || `${docType}_${Date.now()}.jpg`;

      // Create FormData
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: fileName,
        type: "image/jpeg",
      } as any);
      formData.append("tipo", docType);

      // Get API URL from environment or use default
      const apiUrl = (typeof process !== "undefined"
        ? process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000"
        : "http://localhost:4000");

      // Upload via multipart/form-data
      const response = await fetch(`${apiUrl}/api/v1/kyc/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Upload falhou" }));
        throw new Error(errorData.message || "Upload falhou");
      }

      // Update uploads status
      setUploads((prev) => ({
        ...prev,
        [docType]: {
          uploaded: true,
          fileName,
        },
      }));

      setUploadProgress(100);
      Alert.alert("Sucesso", `Documento ${DOCUMENT_LABELS[docType]} enviado com sucesso!`);

      // Check if all required documents are uploaded after a short delay
      setTimeout(() => {
        setUploads((current) => {
          const allUploaded = Object.keys(DOCUMENT_LABELS).every(
            (doc) => current[doc as DocumentType]?.uploaded
          );
          if (allUploaded) {
            showCompletionScreen();
          }
          return current;
        });
      }, 500);
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert(
        "Erro no Upload",
        error.message || "Falha ao enviar documento. Tente novamente."
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedDocument(null);
    }
  };

  const showCompletionScreen = () => {
    Alert.alert(
      "KYC Completo!",
      "Todos os documentos foram enviados com sucesso. Você será redirecionado para o dashboard.",
      [
        {
          text: "Ir para Crédito",
          onPress: () => router.push("/(tabs)/credito"),
        },
      ]
    );
  };

  if (loadingProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const allUploaded = Object.keys(DOCUMENT_LABELS).every(
    (doc) => uploads[doc as DocumentType]?.uploaded
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Verificação de Identidade</Text>

      {user && (
        <>
          <View style={styles.card}>
            <Ionicons name="shield-checkmark" size={40} color="#16a34a" />
            <Text style={styles.cardTitle}>KYC - Know Your Customer</Text>
            <Text style={styles.cardDesc}>
              Envie seus documentos para validar sua identidade e desbloquear crédito
            </Text>
            {user.kycStatus && (
              <View
                style={[
                  styles.statusBadge,
                  user.kycStatus === "APROVADO"
                    ? styles.badgeAprovado
                    : user.kycStatus === "EM_ANALISE"
                    ? styles.badgeAnalise
                    : styles.badgePendente,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    user.kycStatus === "APROVADO"
                      ? styles.badgeTextAprovado
                      : user.kycStatus === "EM_ANALISE"
                      ? styles.badgeTextAnalise
                      : styles.badgeTextPendente,
                  ]}
                >
                  Status: {getStatusLabel(user.kycStatus)}
                </Text>
              </View>
            )}
          </View>

          {/* Credit Info */}
          {user.saldo_credito !== undefined && (
            <View style={styles.creditCard}>
              <View>
                <Text style={styles.creditLabel}>Crédito Disponível</Text>
                <Text style={styles.creditValue}>
                  R$ {user.saldo_credito.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <Ionicons name="wallet" size={28} color="#16a34a" />
            </View>
          )}

          {/* Document Upload Section */}
          <Text style={styles.sectionTitle}>Documentos Necessários</Text>

          {Object.entries(DOCUMENT_LABELS).map(([docType, label]) => {
            const docKey = docType as DocumentType;
            const isUploaded = uploads[docKey]?.uploaded;

            return (
              <View key={docType} style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentLabel}>{label}</Text>
                    <Text style={styles.documentHint}>{DOCUMENT_HINTS[docKey]}</Text>
                  </View>
                  {isUploaded && (
                    <View style={styles.uploadedBadge}>
                      <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                    </View>
                  )}
                </View>

                {!isUploaded && (
                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cameraButton]}
                      onPress={() => pickImageFromCamera(docKey)}
                      disabled={uploading}
                    >
                      <Ionicons name="camera" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Câmera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.galleryButton]}
                      onPress={() => pickImageFromGallery(docKey)}
                      disabled={uploading}
                    >
                      <Ionicons name="image" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Galeria</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {uploading && selectedDocument === docKey && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${uploadProgress}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>{uploadProgress}%</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Completion Status */}
          {allUploaded && (
            <View style={styles.completeCard}>
              <Ionicons name="checkmark-done-outline" size={48} color="#16a34a" />
              <Text style={styles.completeTitle}>Todos os documentos enviados!</Text>
              <Text style={styles.completeDesc}>
                Seus documentos estão sendo analisados. Você receberá uma notificação quando
                forem aprovados.
              </Text>
            </View>
          )}

          {/* Help Section */}
          <View style={styles.helpSection}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Dicas para Sucesso</Text>
              <Text style={styles.helpText}>
                • Boa iluminação natural{"\n"}• Documento completo e legível{"\n"}• Sem reflexos ou
                sombras{"\n"}• Formato retrato ou paisagem
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function getStatusLabel(status: string): string {
  const labels: { [key: string]: string } = {
    PENDENTE: "Pendente",
    APROVADO: "Aprovado",
    REJEITADO: "Rejeitado",
    EM_ANALISE: "Em análise",
  };
  return labels[status] || status;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 12 },
  cardDesc: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginTop: 12 },
  badgeAprovado: { backgroundColor: "#dcfce7" },
  badgeAnalise: { backgroundColor: "#dbeafe" },
  badgePendente: { backgroundColor: "#f3f4f6" },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  badgeTextAprovado: { color: "#166534" },
  badgeTextAnalise: { color: "#1d4ed8" },
  badgeTextPendente: { color: "#6b7280" },
  creditCard: {
    backgroundColor: "#16a34a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  creditLabel: { fontSize: 13, color: "#dcfce7", marginBottom: 8 },
  creditValue: { fontSize: 24, fontWeight: "700", color: "#fff" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  documentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  documentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  documentInfo: { flex: 1 },
  documentLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
  documentHint: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  uploadedBadge: { paddingLeft: 12 },
  buttonGroup: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  cameraButton: { backgroundColor: "#3b82f6" },
  galleryButton: { backgroundColor: "#8b5cf6" },
  actionButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  progressContainer: { marginTop: 12, gap: 8 },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#16a34a",
    borderRadius: 3,
  },
  progressText: { fontSize: 12, color: "#6b7280", textAlign: "right" },
  completeCard: {
    backgroundColor: "#dcfce7",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginTop: 24,
    borderWidth: 2,
    borderColor: "#16a34a",
  },
  completeTitle: { fontSize: 18, fontWeight: "700", color: "#166534", marginTop: 12 },
  completeDesc: {
    fontSize: 13,
    color: "#166534",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  helpSection: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  helpContent: { flex: 1 },
  helpTitle: { fontSize: 14, fontWeight: "600", color: "#1d4ed8", marginBottom: 6 },
  helpText: { fontSize: 12, color: "#1e40af", lineHeight: 18 },
});
