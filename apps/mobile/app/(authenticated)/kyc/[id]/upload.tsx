import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { kycApi, ApiError } from "@/lib/api";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const KYC_TIPOS_LABELS: Record<string, string> = {
  RG: "Documento de Identidade (RG)",
  CPF: "CPF",
  CARTEIRA_MOTORISTA: "Carteira de Motorista",
  PASSPORT: "Passaporte",
  COMPROVANTE_ENDERECO: "Comprovante de Endereço",
};

export default function UploadScreen() {
  const router = useRouter();
  const { id, tipo } = useLocalSearchParams<{ id: string; tipo: string }>();

  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = useCallback(async () => {
    try {
      setError(null);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        
        // Get file info
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        const fileSize = (fileInfo as any).size || 0;

        // Validate file size
        if (fileSize > MAX_FILE_SIZE) {
          setError(`Arquivo muito grande. Máximo permitido: 10 MB (seu arquivo: ${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
          return;
        }

        // Estimate MIME type
        const mimeType = asset.uri.endsWith(".pdf")
          ? "application/pdf"
          : asset.mimeType || "image/jpeg";

        if (!ALLOWED_TYPES.includes(mimeType)) {
          setError("Tipo de arquivo não suportado. Use PNG, JPG ou PDF");
          return;
        }

        setSelectedFile({
          uri: asset.uri,
          name: asset.fileName || `documento-${Date.now()}`,
          size: fileSize,
          type: mimeType,
        });
      }
    } catch (err) {
      setError("Erro ao selecionar arquivo");
      console.error(err);
    }
  }, []);

  const pickCamera = useCallback(async () => {
    try {
      setError(null);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Permissão de câmera negada");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        const fileSize = (fileInfo as any).size || 0;

        if (fileSize > MAX_FILE_SIZE) {
          setError(`Arquivo muito grande. Máximo permitido: 10 MB`);
          return;
        }

        setSelectedFile({
          uri: asset.uri,
          name: `documento-${Date.now()}.jpg`,
          size: fileSize,
          type: "image/jpeg",
        });
      }
    } catch (err) {
      setError("Erro ao acessar câmera");
      console.error(err);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setError("Selecione um arquivo primeiro");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Get presigned URL from backend
      const { uploadUrl, key } = await kycApi.gerarPresignedUrl(tipo || "RG", selectedFile.type);

      // Read file as binary
      const fileData = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to binary buffer using ArrayBuffer
      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to S3 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: bytes,
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Erro ao fazer upload: ${uploadResponse.statusText}`);
      }

      // Extract the file URL from the key
      const s3Url = `https://${process.env.EXPO_PUBLIC_S3_BUCKET ?? "imbobi-kyc"}.s3.amazonaws.com/${key}`;

      // Register the document with the API
      await kycApi.uploadDocumento(tipo || "RG", s3Url);

      Alert.alert("Sucesso", "Documento enviado com sucesso!", [
        {
          text: "OK",
          onPress: () => router.push("/kyc/list"),
        },
      ]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao enviar documento";
      setError(message);
      Alert.alert("Erro", message);
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  }, [selectedFile, tipo]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>
          Enviar {tipo ? KYC_TIPOS_LABELS[tipo] : "Documento"}
        </Text>

        <Text style={styles.instructions}>
          Tire uma foto clara do documento ou selecione uma imagem da galeria
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Document Preview */}
        {selectedFile && selectedFile.type.startsWith("image/") && (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: selectedFile.uri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <Text style={styles.previewFileName}>{selectedFile.name}</Text>
            <Text style={styles.previewFileSize}>
              {(selectedFile.size / 1024).toFixed(2)} KB
            </Text>
          </View>
        )}

        {selectedFile && selectedFile.type === "application/pdf" && (
          <View style={styles.previewContainer}>
            <View style={styles.pdfIcon}>
              <Text style={styles.pdfIconText}>📄</Text>
            </View>
            <Text style={styles.previewFileName}>{selectedFile.name}</Text>
            <Text style={styles.previewFileSize}>
              {(selectedFile.size / 1024).toFixed(2)} KB
            </Text>
          </View>
        )}

        {!selectedFile && (
          <View style={styles.noFileContainer}>
            <Text style={styles.noFileText}>Nenhum arquivo selecionado</Text>
          </View>
        )}

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={pickCamera}
            disabled={uploading}
          >
            <Text style={styles.secondaryButtonText}>📷 Tirar Foto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={pickImage}
            disabled={uploading}
          >
            <Text style={styles.secondaryButtonText}>📁 Selecionar Arquivo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Requisitos do arquivo:</Text>
          <Text style={styles.infoItem}>• Formato: PNG, JPG ou PDF</Text>
          <Text style={styles.infoItem}>• Tamanho máximo: 10 MB</Text>
          <Text style={styles.infoItem}>• Certifique-se que a imagem está clara e legível</Text>
          <Text style={styles.infoItem}>• Documento deve estar completamente visível</Text>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (!selectedFile || uploading) && styles.primaryButtonDisabled,
        ]}
        onPress={handleUpload}
        disabled={!selectedFile || uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Enviar Documento</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 20,
    marginBottom: 8,
  },
  instructions: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
  },
  previewContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  previewImage: {
    width: "100%",
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  pdfIcon: {
    width: 80,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    marginBottom: 12,
  },
  pdfIconText: {
    fontSize: 48,
  },
  previewFileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
    textAlign: "center",
  },
  previewFileSize: {
    fontSize: 12,
    color: "#9ca3af",
  },
  noFileContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 40,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  noFileText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  infoContainer: {
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#047857",
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 13,
    color: "#059669",
    marginBottom: 4,
    lineHeight: 18,
  },
  primaryButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
