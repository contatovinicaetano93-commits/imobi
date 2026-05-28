import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { CameraView, useCameraPermissions } from "expo-camera";
import { calcularDistanciaMetros } from "@imbobi/core";
import { obrasApi, type ObraDetalhe } from "../../../../lib/api";
import { haptics } from "../../../../lib/haptics";

interface LocationInfo {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeoValidationState {
  status: "idle" | "valid" | "invalid";
  distanceMetros: number | null;
  message: string | null;
}

const { width: screenWidth } = Dimensions.get("window");
const cameraSize = screenWidth;

export default function CaptureEvidenciaScreen() {
  const router = useRouter();
  const { obraId } = useLocalSearchParams<{ obraId: string }>();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [obra, setObra] = useState<ObraDetalhe | null>(null);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geoValidation, setGeoValidation] = useState<GeoValidationState>({
    status: "idle",
    distanceMetros: null,
    message: null,
  });

  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load obra info
  useEffect(() => {
    if (!obraId) return;
    obrasApi
      .buscar(obraId)
      .then(setObra)
      .catch((e) => {
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [obraId]);

  // Request camera permission
  useEffect(() => {
    if (permission === null) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Request and update location periodically
  useEffect(() => {
    const requestLocation = async () => {
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
        if (obra) {
          validateLocation(locationData, obra);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao capturar localização";
        setLocationError(message);
      }
    };

    requestLocation();

    // Update location every 3 seconds
    const interval = setInterval(requestLocation, 3000);
    return () => clearInterval(interval);
  }, [obra]);

  const validateLocation = (loc: LocationInfo, obraData: ObraDetalhe) => {
    if (loc.accuracy > 15) {
      setGeoValidation({
        status: "invalid",
        distanceMetros: null,
        message: `Precisão GPS insuficiente: ${Math.round(loc.accuracy)}m. Aguarde sinal melhor.`,
      });
      return;
    }

    const distancia = calcularDistanciaMetros(
      { latitude: loc.latitude, longitude: loc.longitude },
      { latitude: obraData.geoLatitude, longitude: obraData.geoLongitude }
    );

    if (distancia <= obraData.raioValidacaoMetros) {
      setGeoValidation({
        status: "valid",
        distanceMetros: distancia,
        message: `GPS OK - ${Math.round(distancia)}m da obra`,
      });
    } else {
      setGeoValidation({
        status: "invalid",
        distanceMetros: distancia,
        message: `Fora da área: ${Math.round(distancia)}m (máx: ${obraData.raioValidacaoMetros}m)`,
      });
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    if (geoValidation.status !== "valid") {
      await haptics.error();
      Alert.alert("Erro", "Posicione-se dentro da área da obra");
      return;
    }
    if (!location) {
      await haptics.error();
      Alert.alert("Erro", "Localização não disponível");
      return;
    }

    try {
      setCapturing(true);
      await haptics.impact();
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo) {
        await haptics.success();
        // Pass the photo URI and location to the upload screen
        router.push({
          pathname: "/(authenticated)/evidencias/[obraId]/upload",
          params: {
            obraId,
            photoUri: photo.uri,
            latitude: location.latitude.toString(),
            longitude: location.longitude.toString(),
            accuracy: location.accuracy.toString(),
          },
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao capturar foto";
      await haptics.error();
      Alert.alert("Erro", message);
    } finally {
      setCapturing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (error || !obra) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Obra não encontrada"}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Permissão de câmera negada</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const locationStatus = location
    ? `GPS: ${location.accuracy.toFixed(1)}m`
    : "GPS: aguardando...";

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={[styles.camera, { width: screenWidth, height: screenWidth }]}
        facing="back"
      >
        {/* Bounds Overlay */}
        <View style={styles.overlay}>
          {/* Top Section */}
          <View style={[styles.overlaySection, styles.overlayTop]}>
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => {
                  haptics.tap();
                  router.back();
                }}
                accessibilityLabel="Fechar câmera"
                accessibilityRole="button"
                accessibilityHint="Toca para fechar a câmera e voltar"
              >
                <Text style={styles.topBarText}>✕ Fechar</Text>
              </TouchableOpacity>
              <Text style={styles.workTitle}>{obra.nome}</Text>
              <View style={{ width: 40 }} />
            </View>
          </View>

          {/* Center Frame */}
          <View style={styles.centerContainer}>
            <View
              style={[
                styles.frameBox,
                geoValidation.status === "valid"
                  ? styles.frameBoxValid
                  : styles.frameBoxInvalid,
              ]}
            />
            <View
              style={[
                styles.cornerTL,
                geoValidation.status === "valid"
                  ? styles.cornerValid
                  : styles.cornerInvalid,
              ]}
            />
            <View
              style={[
                styles.cornerTR,
                geoValidation.status === "valid"
                  ? styles.cornerValid
                  : styles.cornerInvalid,
              ]}
            />
            <View
              style={[
                styles.cornerBL,
                geoValidation.status === "valid"
                  ? styles.cornerValid
                  : styles.cornerInvalid,
              ]}
            />
            <View
              style={[
                styles.cornerBR,
                geoValidation.status === "valid"
                  ? styles.cornerValid
                  : styles.cornerInvalid,
              ]}
            />
          </View>

          {/* Bottom Section */}
          <View style={[styles.overlaySection, styles.overlayBottom]}>
            {/* GPS Status */}
            <View
              style={[
                styles.statusBadge,
                location ? styles.statusBadgeSuccess : styles.statusBadgeWarning,
              ]}
            >
              <Text style={styles.statusIcon}>📍</Text>
              <Text style={styles.statusText}>{locationStatus}</Text>
            </View>

            {/* Geo Validation */}
            {geoValidation.message && (
              <View
                style={[
                  styles.validationBadge,
                  geoValidation.status === "valid"
                    ? styles.validationBadgeValid
                    : styles.validationBadgeInvalid,
                ]}
              >
                <Text
                  style={[
                    styles.validationText,
                    geoValidation.status === "valid"
                      ? styles.validationTextValid
                      : styles.validationTextInvalid,
                  ]}
                >
                  {geoValidation.status === "valid" ? "✓ " : "✕ "}
                  {geoValidation.message}
                </Text>
              </View>
            )}

            {/* Capture Button */}
            <TouchableOpacity
              style={[
                styles.captureButton,
                (capturing || geoValidation.status !== "valid") &&
                  styles.captureButtonDisabled,
              ]}
              onPress={handleCapture}
              disabled={capturing || geoValidation.status !== "valid"}
              accessibilityLabel="Capturar foto"
              accessibilityRole="button"
              accessibilityHint="Toca para capturar a foto da evidência"
              accessibilityState={{
                disabled: capturing || geoValidation.status !== "valid",
              }}
            >
              {capturing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <View style={styles.captureCircle} />
                  <Text style={styles.captureButtonText}>Capturar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>

      {/* Error Display */}
      {locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {locationError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    flexDirection: "column",
  },
  overlaySection: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayTop: {
    paddingTop: 16,
  },
  overlayBottom: {
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: screenWidth - 32,
    paddingHorizontal: 16,
  },
  topBarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  workTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  centerContainer: {
    flex: 1.2,
    justifyContent: "center",
    alignItems: "center",
  },
  frameBox: {
    width: screenWidth - 80,
    aspectRatio: 4 / 3,
    borderRadius: 16,
    borderWidth: 3,
  },
  frameBoxValid: {
    borderColor: "#16a34a",
  },
  frameBoxInvalid: {
    borderColor: "#ef4444",
  },
  cornerTL: {
    position: "absolute",
    top: 40,
    left: 40,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    position: "absolute",
    top: 40,
    right: 40,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    position: "absolute",
    bottom: 40,
    left: 40,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    position: "absolute",
    bottom: 40,
    right: 40,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  cornerValid: {
    borderColor: "#16a34a",
  },
  cornerInvalid: {
    borderColor: "#ef4444",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusBadgeSuccess: {
    backgroundColor: "#dcfce7",
  },
  statusBadgeWarning: {
    backgroundColor: "#fef3c7",
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
  },
  validationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  validationBadgeValid: {
    backgroundColor: "#dcfce7",
  },
  validationBadgeInvalid: {
    backgroundColor: "#fee2e2",
  },
  validationText: {
    fontSize: 13,
    fontWeight: "600",
  },
  validationTextValid: {
    color: "#166534",
  },
  validationTextInvalid: {
    color: "#991b1b",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  captureButtonDisabled: {
    backgroundColor: "#d1d5db",
    borderColor: "#9ca3af",
  },
  captureCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  captureButtonText: {
    color: "#1f2937",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  errorBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fee2e2",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  errorBannerText: {
    color: "#991b1b",
    fontSize: 13,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 16,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#16a34a",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
