import { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, Alert,
  StyleSheet, ActivityIndicator, ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { apiBaseUrl } from "../../../../lib/api";
import { useGeoValidation } from "@imbobi/core/hooks";
import ScreenHeader from "../../../../components/ScreenHeader";

type GeoStatus = "idle" | "checking" | "inside_radius" | "outside_radius" | "poor_accuracy" | "permission_denied" | "unavailable";

const STATUS_META: Record<GeoStatus, { icon: keyof typeof Ionicons.glyphMap; bg: string; text: string }> = {
  idle:              { icon: "location-outline", bg: "#f3f4f6", text: "#374151" },
  checking:          { icon: "sync", bg: "#dbeafe", text: "#1d4ed8" },
  inside_radius:     { icon: "checkmark-circle", bg: "#dcfce7", text: "#166534" },
  outside_radius:    { icon: "close-circle", bg: "#fee2e2", text: "#991b1b" },
  poor_accuracy:     { icon: "navigate", bg: "#fef9c3", text: "#92400e" },
  permission_denied: { icon: "lock-closed", bg: "#fee2e2", text: "#991b1b" },
  unavailable:       { icon: "cellular-outline", bg: "#fee2e2", text: "#991b1b" },
};

export default function RegistrarEtapaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string; etapaId: string; etapaNome: string;
    geoLat: string; geoLng: string; raio: string;
  }>();

  const [uploading, setUploading] = useState(false);
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  const getPosition = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") throw new Error("permission_denied");
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? 999,
    };
  }, []);

  const { status, distanciaMetros, accuracyMetros, coordenadasAtuais, mensagem, validar } =
    useGeoValidation(
      { latitude: Number(params.geoLat), longitude: Number(params.geoLng) },
      Number(params.raio),
      getPosition
    );

  const meta = STATUS_META[status] ?? STATUS_META.idle;
  const podeCapturar = status === "inside_radius";

  const handleCapturar = async () => {
    const dentro = await validar();
    if (!dentro) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      exif: true,
    });
    if (result.canceled || !result.assets[0]) return;
    setFotoUri(result.assets[0].uri);
  };

  const handleEnviar = async () => {
    if (!fotoUri || !coordenadasAtuais) return;
    setUploading(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const form = new FormData();
      form.append("file", { uri: fotoUri, name: "evidencia.jpg", type: "image/jpeg" } as never);
      form.append("etapaId", params.etapaId);
      form.append("latitude", String(coordenadasAtuais.latitude));
      form.append("longitude", String(coordenadasAtuais.longitude));
      form.append("accuracyMetros", String(accuracyMetros ?? 10));
      form.append("timestampCaptura", new Date().toISOString());
      const res = await fetch(`${apiBaseUrl()}/evidencias`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        Alert.alert("Erro no envio", err.message ?? "Tente novamente.");
        return;
      }
      Alert.alert(
        "Evidência enviada",
        "Foto registrada no local da obra. O engenheiro validará a evidência e o admin aprovará o crédito no comitê.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch {
      Alert.alert("Erro", "Falha na conexão. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Validar etapa" subtitle={params.etapaNome} dark />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.hint}>
          Tire a foto dentro do raio da obra. Fluxo: construtor envia → engenheiro valida → admin libera crédito.
        </Text>

        <View style={[styles.statusCard, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={28} color={meta.text} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusMsg, { color: meta.text }]}>{mensagem}</Text>
            {distanciaMetros !== null && (
              <Text style={styles.distancia}>
                {Math.round(distanciaMetros)}m da obra · GPS ±{Math.round(accuracyMetros ?? 0)}m
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.checkBtn} onPress={validar} disabled={status === "checking"}>
          {status === "checking"
            ? <ActivityIndicator color="#1B4FD8" />
            : <Text style={styles.checkBtnText}>Verificar localização GPS</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cameraBtn, !podeCapturar && styles.btnDisabled]}
          onPress={handleCapturar}
          disabled={!podeCapturar}
        >
          <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.cameraBtnText}>{fotoUri ? "Tirar outra foto" : "Tirar foto da etapa"}</Text>
        </TouchableOpacity>

        {fotoUri && (
          <View style={styles.previewBlock}>
            <Text style={styles.previewLabel}>Foto capturada</Text>
            <TouchableOpacity style={[styles.enviarBtn, uploading && styles.btnDisabled]} onPress={handleEnviar} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.enviarBtnText}>Enviar para vistoria</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 20, gap: 16, paddingBottom: 40 },
  hint: { fontSize: 14, color: "#64748B", lineHeight: 20 },
  statusCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, padding: 16 },
  statusMsg: { fontSize: 15, fontWeight: "600", lineHeight: 22 },
  distancia: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  checkBtn: { borderWidth: 1.5, borderColor: "#1B4FD8", borderRadius: 14, padding: 14, alignItems: "center" },
  checkBtnText: { color: "#1B4FD8", fontSize: 15, fontWeight: "600" },
  cameraBtn: { backgroundColor: "#1B4FD8", borderRadius: 16, padding: 18, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  btnDisabled: { opacity: 0.4 },
  cameraBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  previewBlock: { gap: 12 },
  previewLabel: { fontSize: 14, color: "#166534", fontWeight: "600", textAlign: "center" },
  enviarBtn: { backgroundColor: "#0C1A3D", borderRadius: 16, padding: 18, alignItems: "center" },
  enviarBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
