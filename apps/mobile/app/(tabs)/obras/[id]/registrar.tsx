import { useState, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { useGeoValidation } from "@imbobi/core";

interface Props {
  obraGeoLat: number;
  obraGeoLng: number;
  raioMetros: number;
  etapaId: string;
}

export default function RegistrarEtapaScreen({
  obraGeoLat,
  obraGeoLng,
  raioMetros,
  etapaId,
}: Props) {
  const [uploading, setUploading] = useState(false);

  // Injeta o provider de localização nativo do Expo no hook compartilhado
  const getPosition = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") throw new Error("permission_denied");

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? 999,
    };
  }, []);

  const { status, distanciaMetros, mensagem, validar } = useGeoValidation(
    { latitude: obraGeoLat, longitude: obraGeoLng },
    raioMetros,
    getPosition
  );

  const handleCapturar = async () => {
    const dentro = await validar();
    if (!dentro) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      exif: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", {
        uri: asset.uri,
        name: "evidencia.jpg",
        type: "image/jpeg",
      } as unknown as Blob);
      form.append("etapaId", etapaId);
      form.append("latitude", String(asset.exif?.GPSLatitude ?? obraGeoLat));
      form.append("longitude", String(asset.exif?.GPSLongitude ?? obraGeoLng));
      form.append("accuracyMetros", String(10));
      form.append("timestampCaptura", new Date().toISOString());

      const res = await fetch(
        `${process.env["EXPO_PUBLIC_API_URL"]}/api/v1/evidencias`,
        { method: "POST", body: form }
      );

      if (!res.ok) {
        const err = await res.json() as { message?: string };
        Alert.alert("Erro no upload", err.message ?? "Tente novamente.");
        return;
      }

      Alert.alert("Sucesso!", "Foto registrada com sucesso.");
    } finally {
      setUploading(false);
    }
  };

  const isInsideRadius = status === "inside_radius";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registrar Etapa</Text>

      <View style={[styles.statusCard, isInsideRadius ? styles.success : styles.warning]}>
        <Text style={styles.statusText}>{mensagem}</Text>
        {distanciaMetros !== null && (
          <Text style={styles.distanceText}>
            {Math.round(distanciaMetros)}m da obra
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, !isInsideRadius && styles.buttonDisabled]}
        onPress={handleCapturar}
        disabled={!isInsideRadius || uploading}
      >
        <Text style={styles.buttonText}>
          {uploading ? "Enviando..." : "Tirar Foto da Etapa"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.checkButton} onPress={validar}>
        <Text style={styles.checkButtonText}>Verificar localização</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#f9fafb" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 24 },
  statusCard: { borderRadius: 16, padding: 16, marginBottom: 24 },
  success: { backgroundColor: "#dcfce7" },
  warning: { backgroundColor: "#fef3c7" },
  statusText: { fontSize: 15, color: "#111827", fontWeight: "500" },
  distanceText: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: { backgroundColor: "#d1d5db" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  checkButton: { alignItems: "center", padding: 12 },
  checkButtonText: { color: "#16a34a", fontSize: 15, fontWeight: "600" },
});
