import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { useLocationCapture, useCameraCapture, calcularDistanciaMetros } from "@imbobi/core";
import { UploadEvidenciaSchema } from "@imbobi/schemas";
import { evidenciasApi, ApiError } from "../../../../lib/api";

interface ObraInfo {
  geoLatitude: number;
  geoLongitude: number;
  raioValidacaoMetros: number;
  nome: string;
}

interface LocationInfo {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export default function UploadEvidenciaScreen() {
  const router = useRouter();
  const { obraId, etapaId } = useLocalSearchParams<{ obraId: string; etapaId: string }>();

  const [selectedImage, setSelectedImage] = useState<{
    uri: string;
    base64?: string;
    size: number;
  } | null>(null);

  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geoValidation, setGeoValidation] = useState<{
    status: "idle" | "validating" | "valid" | "invalid";
    message: string | null;
    distanceMetros: number | null;
  }>({
    status: "idle",
    message: null,
    distanceMetros: null,
  });

  const [obraInfo, setObraInfo] = useState<ObraInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");

  // Load obra info from navigation params or API
  useEffect(() => {
    // For now, use default values. In production, fetch from API
    setObraInfo({
      geoLatitude: -23.5505,
      geoLongitude: -46.6333,
      raioValidacaoMetros: 50,
      nome: "Obra em Construção",
    });
  }, []);

  // Capture location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = useCallback(async () => {
    try {
      setLocationError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Permissão de localização negada");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const locationData: LocationInfo = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
      };

      setLocation(locationData);

      // Validate location against obra bounds
      if (obraInfo) {
        validateLocation(locationData, obraInfo);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao capturar localização";
      setLocationError(message);
    }
  }, [obraInfo]);

  const validateLocation = (loc: LocationInfo, obra: ObraInfo) => {
    if (loc.accuracy > 15) {
      setGeoValidation({
        status: "invalid",
        message: `Precisão GPS insuficiente: ${Math.round(loc.accuracy)}m. Aguarde sinal melhor.`,
        distanceMetros: null,
      });
      return;
    }

    const distancia = calcularDistanciaMetros(
      { latitude: loc.latitude, longitude: loc.longitude },
      { latitude: obra.geoLatitude, longitude: obra.geoLongitude }
    );

    if (distancia <= obra.raioValidacaoMetros) {
      setGeoValidation({
        status: "valid",
        message: `Localização validada (${Math.round(distancia)}m da obra)`,
        distanceMetros: distancia,
      });
    } else {
      setGeoValidation({
        status: "invalid",
        message: `Você está a ${Math.round(distancia)}m da obra. Máximo: ${obra.raioValidacaoMetros}m.`,
        distanceMetros: distancia,
      });
    }
  };

  const pickImageFromLibrary = useCallback(async () => {
    try {
      setError(null);

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        setError("Permissão de galeria negada");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];

        // Get file size
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        const fileSize = (fileInfo as any).size || 0;

        if (fileSize > 10 * 1024 * 1024) {
          setError("Arquivo muito grande. Máximo 10 MB");
          return;
        }

        // Get base64 for compression/upload
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setSelectedImage({
          uri: asset.uri,
          base64,
          size: fileSize,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao selecionar imagem";
      setError(message);
    }
  }, []);

  const pickImageFromCamera = useCallback(async () => {
    try {
      setError(null);

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Permissão de câmera negada");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (!result.canceled) {
        const asset = result.assets[0];

        // Get file size
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        const fileSize = (fileInfo as any).size || 0;

        if (fileSize > 10 * 1024 * 1024) {
          setError("Arquivo muito grande. Máximo 10 MB");
          return;
        }

        // Get base64
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setSelectedImage({
          uri: asset.uri,
          base64,
          size: fileSize,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao acessar câmera";
      setError(message);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedImage) {
      setError("Selecione uma foto primeiro");
      return;
    }

    if (!location) {
      setError("Localização não capturada");
      return;
    }

    if (geoValidation.status !== "valid") {
      setError("Localização fora da área permitida");
      return;
    }

    if (!etapaId) {
      setError("Etapa não informada");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Validate with Zod schema
      const validado = UploadEvidenciaSchema.safeParse({
        etapaId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMetros: location.accuracy,
        timestampCaptura: new Date().toISOString(),
        descricao: descricao.trim() || undefined,
      });

      if (!validado.success) {
        const errorMsg =
          validado.error.errors[0]?.message || "Dados inválidos";
        setError(errorMsg);
        return;
      }

      // Create FormData for multipart upload
      const formData = new FormData();

      // Append file
      formData.append("file", {
        uri: selectedImage.uri,
        type: "image/jpeg",
        name: `evidencia-${Date.now()}.jpg`,
      } as any);

      // Append metadata
      formData.append("etapaId", etapaId);
      formData.append("latitude", String(location.latitude));
      formData.append("longitude", String(location.longitude));
      formData.append("accuracyMetros", String(location.accuracy));
      formData.append("timestampCaptura", new Date().toISOString());
      if (descricao.trim()) {
        formData.append("descricao", descricao.trim());
      }

      // Upload
      const response = await evidenciasApi.upload(formData, etapaId);

      Alert.alert(
        "Sucesso",
        "Evidência enviada com sucesso!",
        [
          {
            text: "OK",
            onPress: () => {
              router.push({
                pathname: "/obras/[id]",
                params: { id: obraId },
              });
            },
          },
        ]
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao enviar evidência";
      setError(message);
      Alert.alert("Erro", message);
    } finally {
      setUploading(false);
    }
  }, [selectedImage, location, geoValidation, etapaId, obraId, descricao]);

  const locationStatus = location
    ? `GPS: ${location.accuracy.toFixed(1)}m`
    : "GPS: aguardando...";

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Registrar Evidência</Text>
        <Text style={styles.subtitle}>Foto + GPS da obra em construção</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Location Status */}
        <View
          style={[
            styles.statusCard,
            location && styles.statusCardSuccess,
            locationError && styles.statusCardError,
          ]}
        >
          <View>
            <Text style={styles.statusLabel}>Localização GPS</Text>
            <Text style={styles.statusValue}>{locationStatus}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={requestLocation}
            disabled={uploading}
          >
            <Text style={styles.refreshButtonText}>🔄 Atualizar</Text>
          </TouchableOpacity>
        </View>

        {/* Geo Validation */}
        {geoValidation.status !== "idle" && (
          <View
            style={[
              styles.validationCard,
              geoValidation.status === "valid" &&
                styles.validationCardSuccess,
              geoValidation.status === "invalid" &&
                styles.validationCardError,
            ]}
          >
            <View style={styles.validationIcon}>
              <Text style={styles.validationIconText}>
                {geoValidation.status === "valid" ? "✓" : "✕"}
              </Text>
            </View>
            <View style={styles.validationContent}>
              <Text style={styles.validationMessage}>
                {geoValidation.message}
              </Text>
              {geoValidation.distanceMetros !== null && (
                <Text style={styles.validationDistance}>
                  Distância: {Math.round(geoValidation.distanceMetros)}m
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Image Preview */}
        {selectedImage && (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <Text style={styles.previewSize}>
              {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
            </Text>
            <TouchableOpacity
              style={styles.clearImageButton}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.clearImageButtonText}>✕ Trocar imagem</Text>
            </TouchableOpacity>
          </View>
        )}

        {!selectedImage && (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>Nenhuma imagem selecionada</Text>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={pickImageFromCamera}
            disabled={uploading}
          >
            <Text style={styles.secondaryButtonText}>📷 Tirar Foto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={pickImageFromLibrary}
            disabled={uploading}
          >
            <Text style={styles.secondaryButtonText}>📁 Galeria</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={styles.descricaoContainer}>
          <Text style={styles.descricaoLabel}>Descrição (opcional)</Text>
          <View style={styles.textInputContainer}>
            <Text style={styles.textInput}>{descricao || "Adicione detalhes sobre a foto..."}</Text>
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Requisitos:</Text>
          <InfoItem
            icon="✓"
            text="Foto clara e bem iluminada"
          />
          <InfoItem
            icon="✓"
            text="GPS com precisão melhor que 15m"
          />
          <InfoItem
            icon="✓"
            text="Localização dentro da área da obra"
          />
          <InfoItem
            icon="✓"
            text="Arquivo menor que 10 MB"
          />
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (!selectedImage ||
            uploading ||
            geoValidation.status !== "valid") &&
            styles.primaryButtonDisabled,
        ]}
        onPress={handleUpload}
        disabled={
          !selectedImage || uploading || geoValidation.status !== "valid"
        }
      >
        {uploading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Enviar Evidência</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function InfoItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: "#dcfce7",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 8,
        }}
      >
        <Text style={{ color: "#16a34a", fontSize: 12, fontWeight: "700" }}>
          {icon}
        </Text>
      </View>
      <Text style={{ color: "#6b7280", fontSize: 13 }}>{text}</Text>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 20,
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
    fontSize: 13,
  },
  statusCard: {
    flexDirection: "row",
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  statusCardSuccess: {
    backgroundColor: "#dcfce7",
    borderLeftColor: "#16a34a",
  },
  statusCardError: {
    backgroundColor: "#fee2e2",
    borderLeftColor: "#dc2626",
  },
  statusLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  refreshButtonText: {
    fontSize: 12,
    color: "#374151",
  },
  validationCard: {
    flexDirection: "row",
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  validationCardSuccess: {
    backgroundColor: "#dcfce7",
    borderLeftColor: "#16a34a",
  },
  validationCardError: {
    backgroundColor: "#fee2e2",
    borderLeftColor: "#dc2626",
  },
  validationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  validationIconText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  validationContent: {
    flex: 1,
  },
  validationMessage: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 2,
  },
  validationDistance: {
    fontSize: 11,
    color: "#6b7280",
  },
  previewContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 240,
    borderRadius: 8,
    marginBottom: 10,
  },
  previewSize: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 10,
  },
  clearImageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fee2e2",
    borderRadius: 6,
  },
  clearImageButtonText: {
    fontSize: 12,
    color: "#991b1b",
    fontWeight: "600",
  },
  noImageContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  noImageText: {
    fontSize: 13,
    color: "#9ca3af",
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  descricaoContainer: {
    marginBottom: 16,
  },
  descricaoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  textInputContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minHeight: 80,
  },
  textInput: {
    fontSize: 13,
    color: "#9ca3af",
  },
  infoSection: {
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#047857",
    marginBottom: 10,
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
