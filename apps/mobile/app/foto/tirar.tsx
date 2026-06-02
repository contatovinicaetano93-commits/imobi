import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { initializeGPS, useGPS, useGeoValidation } from "@imbobi/core";
import { UploadEvidenciaSchema } from "@imbobi/schemas";

declare const process: { env: Record<string, string | undefined> };

type GeoStatus =
  | "idle"
  | "checking"
  | "inside_radius"
  | "outside_radius"
  | "poor_accuracy"
  | "permission_denied"
  | "unavailable";

const STATUS_META: Record<GeoStatus, { emoji: string; bg: string; text: string }> = {
  idle: { emoji: "📍", bg: "#f3f4f6", text: "#374151" },
  checking: { emoji: "🔄", bg: "#dbeafe", text: "#1d4ed8" },
  inside_radius: { emoji: "✅", bg: "#dcfce7", text: "#166534" },
  outside_radius: { emoji: "⛔", bg: "#fee2e2", text: "#991b1b" },
  poor_accuracy: { emoji: "📡", bg: "#fef9c3", text: "#92400e" },
  permission_denied: { emoji: "🔒", bg: "#fee2e2", text: "#991b1b" },
  unavailable: { emoji: "📵", bg: "#fee2e2", text: "#991b1b" },
};

// Inicializa GPS na primeira renderização
let gpsInitialized = false;

export default function TirarFotoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    etapaId: string;
    etapaNome: string;
    geoLat: string;
    geoLng: string;
    raio: string;
  }>();

  const [uploading, setUploading] = useState(false);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");

  // Inicializa GPS uma única vez
  useEffect(() => {
    if (!gpsInitialized) {
      initializeGPS(
        () => Location.requestForegroundPermissionsAsync(),
        async () => {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });
          return {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? 999,
          };
        }
      );
      gpsInitialized = true;
    }
  }, []);

  const { getPosition } = useGPS();

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
    if (!fotoUri || !coordenadasAtuais) {
      Alert.alert("Erro", "Foto ou localização não capturada.");
      return;
    }

    setUploading(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const apiUrl = process.env["EXPO_PUBLIC_API_URL"] ?? "";

      // Valida contra schema
      const dados = {
        etapaId: params.etapaId,
        latitude: coordenadasAtuais.latitude,
        longitude: coordenadasAtuais.longitude,
        accuracyMetros: accuracyMetros ?? 10,
        timestampCaptura: new Date().toISOString(),
        descricao: descricao || undefined,
      };

      const validacao = UploadEvidenciaSchema.safeParse(dados);
      if (!validacao.success) {
        Alert.alert("Erro de validação", validacao.error.errors[0]?.message ?? "Dados inválidos");
        setUploading(false);
        return;
      }

      const form = new FormData();
      form.append("file", { uri: fotoUri, name: "evidencia.jpg", type: "image/jpeg" } as never);
      form.append("etapaId", dados.etapaId);
      form.append("latitude", String(dados.latitude));
      form.append("longitude", String(dados.longitude));
      form.append("accuracyMetros", String(dados.accuracyMetros));
      form.append("timestampCaptura", dados.timestampCaptura);
      if (dados.descricao) {
        form.append("descricao", dados.descricao);
      }

      const res = await fetch(`${apiUrl}/api/v1/evidencias`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: form,
      });

      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        Alert.alert("Erro no envio", err.message ?? "Tente novamente.");
        return;
      }

      Alert.alert(
        "Registrado!",
        "Foto enviada com sucesso. Aguarde a validação do gestor.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha na conexão";
      Alert.alert("Erro", msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{params.etapaNome}</Text>
      <Text style={styles.subtitle}>Capturar evidência de obra</Text>

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
        {status === "checking" ? (
          <ActivityIndicator color="#16a34a" />
        ) : (
          <Text style={styles.checkBtnText}>Verificar minha localização</Text>
        )}
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
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.enviarBtnText}>Enviar para vistoria</Text>
            )}
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
  statusCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 16,
    padding: 16,
  },
  statusEmoji: { fontSize: 24 },
  statusMsg: { fontSize: 15, fontWeight: "600", lineHeight: 22 },
  distancia: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  checkBtn: {
    borderWidth: 1.5,
    borderColor: "#16a34a",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  checkBtnText: { color: "#16a34a", fontSize: 15, fontWeight: "600" },
  cameraBtn: { backgroundColor: "#16a34a", borderRadius: 16, padding: 18, alignItems: "center" },
  btnDisabled: { opacity: 0.4 },
  cameraBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  previewBlock: { gap: 12 },
  previewLabel: { fontSize: 14, color: "#16a34a", fontWeight: "600", textAlign: "center" },
  enviarBtn: { backgroundColor: "#1d4ed8", borderRadius: 16, padding: 18, alignItems: "center" },
  enviarBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
