import { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, Alert,
  StyleSheet, ActivityIndicator, ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";

// ── Haversine + useGeoValidation inlined to avoid CJS bundle duplicating React ──
function calcularDistanciaMetros(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

type GeoStatus =
  | "idle" | "checking" | "inside_radius" | "outside_radius"
  | "poor_accuracy" | "permission_denied" | "unavailable";

interface GeoState {
  status: GeoStatus;
  distanciaMetros: number | null;
  accuracyMetros: number | null;
  coordenadasAtuais: { latitude: number; longitude: number } | null;
  mensagem: string;
}

const MSGS: Record<GeoStatus, string> = {
  idle:             "Aguardando verificação de localização.",
  checking:         "Verificando sua localização...",
  inside_radius:    "Localização confirmada. Você está na obra!",
  outside_radius:   "Você está fora da área da obra.",
  poor_accuracy:    "Sinal GPS fraco. Aguarde e tente novamente.",
  permission_denied:"Permissão de localização negada.",
  unavailable:      "GPS indisponível neste dispositivo.",
};

function useGeoValidation(
  alvo: { latitude: number; longitude: number },
  raioMetros: number,
  getPosition: () => Promise<{ latitude: number; longitude: number; accuracy: number }>
) {
  const [state, setState] = useState<GeoState>({
    status: "idle", distanciaMetros: null, accuracyMetros: null,
    coordenadasAtuais: null, mensagem: MSGS.idle,
  });

  const validar = useCallback(async () => {
    setState((s) => ({ ...s, status: "checking", mensagem: MSGS.checking }));
    try {
      const pos = await getPosition();
      const MAX_ACCURACY = 30;
      if (pos.accuracy > MAX_ACCURACY) {
        setState({ status: "poor_accuracy", distanciaMetros: null,
          accuracyMetros: pos.accuracy, coordenadasAtuais: pos, mensagem: MSGS.poor_accuracy });
        return false;
      }
      const dist = calcularDistanciaMetros(pos, alvo);
      const dentro = dist <= raioMetros;
      setState({
        status: dentro ? "inside_radius" : "outside_radius",
        distanciaMetros: dist, accuracyMetros: pos.accuracy, coordenadasAtuais: pos,
        mensagem: dentro ? MSGS.inside_radius : `${MSGS.outside_radius} Distância: ${Math.round(dist)}m`,
      });
      return dentro;
    } catch (err) {
      const status =
        err instanceof Error && err.message.includes("denied") ? "permission_denied" : "unavailable";
      setState({ status, distanciaMetros: null, accuracyMetros: null,
        coordenadasAtuais: null, mensagem: MSGS[status] });
      return false;
    }
  }, [alvo, raioMetros, getPosition]);

  return { ...state, validar };
}

// ── UI ───────────────────────────────────────────────────────────────────────

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
  const [fotoUri, setFotoUri]     = useState<string | null>(null);

  const getPosition = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") throw new Error("permission_denied");
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    return {
      latitude:  loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy:  loc.coords.accuracy ?? 999,
    };
  }, []);

  const geoAlvo   = { latitude: Number(params.geoLat ?? "0"), longitude: Number(params.geoLng ?? "0") };
  const geoRaio   = Number(params.raio ?? "50");
  const geoValido = !Number.isNaN(geoAlvo.latitude) && !Number.isNaN(geoAlvo.longitude) && geoRaio > 0;

  const { status, distanciaMetros, accuracyMetros, coordenadasAtuais, mensagem, validar } =
    useGeoValidation(geoAlvo, geoRaio, getPosition);

  const meta         = STATUS_META[status] ?? STATUS_META.idle;
  const podeCapturar = status === "inside_radius" && geoValido;

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
      const token  = await SecureStore.getItemAsync("accessToken");
      const apiUrl = process.env["EXPO_PUBLIC_API_URL"] ?? "";
      const form   = new FormData();
      form.append("file", { uri: fotoUri, name: "evidencia.jpg", type: "image/jpeg" } as never);
      form.append("etapaId",          params.etapaId);
      form.append("latitude",         String(coordenadasAtuais.latitude));
      form.append("longitude",        String(coordenadasAtuais.longitude));
      form.append("accuracyMetros",   String(accuracyMetros ?? 10));
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
      Alert.alert("Registrado!", "Foto enviada. Aguarde a validação do gestor.",
        [{ text: "OK", onPress: () => router.back() }]);
    } catch {
      Alert.alert("Erro", "Falha na conexão. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Text style={s.title}>{params.etapaNome}</Text>
      <Text style={s.subtitle}>Registrar evidência</Text>

      <View style={[s.statusCard, { backgroundColor: meta.bg }]}>
        <Text style={s.statusEmoji}>{meta.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.statusMsg, { color: meta.text }]}>{mensagem}</Text>
          {distanciaMetros !== null && (
            <Text style={s.distancia}>
              {Math.round(distanciaMetros)}m da obra · GPS ±{Math.round(accuracyMetros ?? 0)}m
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={s.checkBtn} onPress={validar} disabled={status === "checking"}>
        {status === "checking"
          ? <ActivityIndicator color="#1B4FD8" />
          : <Text style={s.checkBtnText}>Verificar minha localização</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.cameraBtn, !podeCapturar && s.btnDisabled]}
        onPress={handleCapturar}
        disabled={!podeCapturar}
      >
        <Text style={s.cameraBtnText}>
          {fotoUri ? "📷 Tirar outra foto" : "📷 Tirar foto da etapa"}
        </Text>
      </TouchableOpacity>

      {fotoUri && (
        <View style={s.previewBlock}>
          <Text style={s.previewLabel}>Foto capturada ✓</Text>
          <TouchableOpacity
            style={[s.enviarBtn, uploading && s.btnDisabled]}
            onPress={handleEnviar}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.enviarBtnText}>Enviar para vistoria</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:       { flex: 1, backgroundColor: "#f9fafb" },
  container:    { padding: 24, paddingTop: 56, gap: 16, paddingBottom: 40 },
  title:        { fontSize: 22, fontWeight: "700", color: "#111827" },
  subtitle:     { fontSize: 15, color: "#6b7280", marginTop: -8 },
  statusCard:   { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, padding: 16 },
  statusEmoji:  { fontSize: 24 },
  statusMsg:    { fontSize: 15, fontWeight: "600", lineHeight: 22 },
  distancia:    { fontSize: 12, color: "#6b7280", marginTop: 4 },
  checkBtn:     { borderWidth: 1.5, borderColor: "#1B4FD8", borderRadius: 14, padding: 14, alignItems: "center" },
  checkBtnText: { color: "#1B4FD8", fontSize: 15, fontWeight: "600" },
  cameraBtn:    { backgroundColor: "#1B4FD8", borderRadius: 16, padding: 18, alignItems: "center" },
  btnDisabled:  { opacity: 0.4 },
  cameraBtnText:{ color: "#fff", fontSize: 16, fontWeight: "700" },
  previewBlock: { gap: 12 },
  previewLabel: { fontSize: 14, color: "#16a34a", fontWeight: "600", textAlign: "center" },
  enviarBtn:    { backgroundColor: "#0C1A3D", borderRadius: 16, padding: 18, alignItems: "center" },
  enviarBtnText:{ color: "#fff", fontSize: 16, fontWeight: "700" },
});
