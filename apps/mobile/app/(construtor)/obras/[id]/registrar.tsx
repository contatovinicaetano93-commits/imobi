import { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, Alert,
  StyleSheet, ActivityIndicator, ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";

type GeoStatus = "idle" | "checking" | "inside_radius" | "outside_radius" | "poor_accuracy" | "permission_denied" | "unavailable";

function calcDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function useGeoValidation(alvo: { latitude: number; longitude: number }, raio: number, getPosition: () => Promise<{ latitude: number; longitude: number; accuracy: number }>) {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [distanciaMetros, setDistancia] = useState<number | null>(null);
  const [accuracyMetros, setAccuracy] = useState<number | null>(null);
  const [coordenadasAtuais, setCoordenadas] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mensagem, setMensagem] = useState("Aguardando verificação de localização.");

  const validar = useCallback(async () => {
    setStatus("checking"); setMensagem("Verificando sua localização...");
    try {
      const pos = await getPosition();
      if (pos.accuracy > 15) {
        setStatus("poor_accuracy"); setAccuracy(pos.accuracy); setCoordenadas(pos);
        setDistancia(null);
        setMensagem("Sinal GPS fraco. Aguarde um momento e tente novamente.");
        return false;
      }
      const dist = calcDistancia(pos.latitude, pos.longitude, alvo.latitude, alvo.longitude);
      const dentro = dist <= raio;
      setDistancia(dist); setAccuracy(pos.accuracy); setCoordenadas(pos);
      setStatus(dentro ? "inside_radius" : "outside_radius");
      setMensagem(dentro ? "Localização confirmada. Você está na obra!" : `Você está fora da área da obra. Distância: ${Math.round(dist)}m`);
      return dentro;
    } catch (err) {
      const s = err instanceof Error && err.message.includes("denied") ? "permission_denied" : "unavailable";
      setStatus(s); setMensagem(s === "permission_denied" ? "Permissão de localização negada." : "GPS indisponível neste dispositivo.");
      return false;
    }
  }, [alvo.latitude, alvo.longitude, raio, getPosition]);

  return { status, distanciaMetros, accuracyMetros, coordenadasAtuais, mensagem, validar };
}

const STATUS_META: Record<GeoStatus, { emoji: string; bg: string; text: string }> = {
  idle:             { emoji: "📍", bg: "#f3f4f6", text: "#374151" },
  checking:         { emoji: "🔄", bg: "#dbeafe", text: "#1d4ed8" },
  inside_radius:    { emoji: "✅", bg: "#dcfce7", text: "#166534" },
  outside_radius:   { emoji: "⛔", bg: "#fee2e2", text: "#991b1b" },
  poor_accuracy:    { emoji: "📡", bg: "#fef9c3", text: "#92400e" },
  permission_denied:{ emoji: "🔒", bg: "#fee2e2", text: "#991b1b" },
  unavailable:      { emoji: "📵", bg: "#fee2e2", text: "#991b1b" },
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
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
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
    // Revalida antes de abrir a câmera
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
    if (!fotoUri || !coordenadasAtuais || status !== "inside_radius") return;

    setUploading(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

      const form = new FormData();
      form.append("file", { uri: fotoUri, name: "evidencia.jpg", type: "image/jpeg" } as never);
      form.append("etapaId", params.etapaId);
      form.append("latitude", String(coordenadasAtuais.latitude));
      form.append("longitude", String(coordenadasAtuais.longitude));
      form.append("accuracyMetros", String(accuracyMetros ?? 10));
      form.append("timestampCaptura", new Date().toISOString());

      const res = await fetch(`${apiUrl}/api/v1/evidencias`, {
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
        "Registrado!",
        "Foto enviada. Aguarde a validação do gestor.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch {
      Alert.alert("Erro", "Falha na conexão. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{params.etapaNome}</Text>
      <Text style={styles.subtitle}>Registrar evidência</Text>

      {/* Status GPS */}
      <View style={[styles.statusCard, { backgroundColor: meta.bg }]}>
        <Text style={styles.statusEmoji}>{meta.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusMsg, { color: meta.text }]}>{mensagem}</Text>
          {distanciaMetros !== null && (
            <Text style={styles.distancia}>
              {Math.round(distanciaMetros)}m da obra · GPS ±{Math.round(accuracyMetros ?? 0)}m
            </Text>
          )}
        </View>
      </View>

      {/* Botão verificar localização */}
      <TouchableOpacity
        style={styles.checkBtn}
        onPress={validar}
        disabled={status === "checking"}
      >
        {status === "checking"
          ? <ActivityIndicator color="#16a34a" />
          : <Text style={styles.checkBtnText}>Verificar minha localização</Text>
        }
      </TouchableOpacity>

      {/* Botão câmera */}
      <TouchableOpacity
        style={[styles.cameraBtn, !podeCapturar && styles.btnDisabled]}
        onPress={handleCapturar}
        disabled={!podeCapturar}
      >
        <Text style={styles.cameraBtnText}>
          {fotoUri ? "📷 Tirar outra foto" : "📷 Tirar foto da etapa"}
        </Text>
      </TouchableOpacity>

      {/* Preview + enviar */}
      {fotoUri && (
        <View style={styles.previewBlock}>
          <Text style={styles.previewLabel}>Foto capturada ✓</Text>
          <TouchableOpacity
            style={[styles.enviarBtn, uploading && styles.btnDisabled]}
            onPress={handleEnviar}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.enviarBtnText}>Enviar para vistoria</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 24, paddingTop: 56, gap: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 15, color: "#6b7280", marginTop: -8 },
  statusCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, padding: 16 },
  statusEmoji: { fontSize: 24 },
  statusMsg: { fontSize: 15, fontWeight: "600", lineHeight: 22 },
  distancia: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  checkBtn: { borderWidth: 1.5, borderColor: "#16a34a", borderRadius: 14, padding: 14, alignItems: "center" },
  checkBtnText: { color: "#16a34a", fontSize: 15, fontWeight: "600" },
  cameraBtn: { backgroundColor: "#16a34a", borderRadius: 16, padding: 18, alignItems: "center" },
  btnDisabled: { opacity: 0.4 },
  cameraBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  previewBlock: { gap: 12 },
  previewLabel: { fontSize: 14, color: "#16a34a", fontWeight: "600", textAlign: "center" },
  enviarBtn: { backgroundColor: "#1d4ed8", borderRadius: 16, padding: 18, alignItems: "center" },
  enviarBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
