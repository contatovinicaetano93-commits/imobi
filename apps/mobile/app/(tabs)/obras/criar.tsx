import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { CriarObraSchema } from "@imbobi/schemas";
import { ApiError, requestWithCsrf } from "../../../lib/api";
import { haptics } from "../../../lib/haptics";

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export default function CriarObraScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Form fields
  const [nome, setNome] = useState("");
  const [areaM2, setAreaM2] = useState("");
  const [dataConclusalso, setDataConclusaoPrevista] = useState("");

  // Address fields
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("SP");
  const [cep, setCep] = useState("");

  // Geo fields
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [raioMetros, setRaioMetros] = useState("80");

  // UI State
  const [showUfModal, setShowUfModal] = useState(false);
  const ufRef = useRef(null);

  const handleGetLocation = useCallback(async () => {
    try {
      setGeoError(null);
      await haptics.impact();

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGeoError("Permissão de localização negada");
        await haptics.error();
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
      await haptics.success();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao obter localização";
      setGeoError(message);
      await haptics.error();
    }
  }, []);

  const handleCriarObra = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await haptics.impact();

      if (!latitude || !longitude) {
        setError("Localização GPS é obrigatória");
        await haptics.error();
        return;
      }

      const data = {
        nome,
        areaM2: parseFloat(areaM2),
        dataConclusaoPrevistaISO: new Date(dataConclusalso).toISOString(),
        endereco: {
          logradouro,
          numero,
          complemento: complemento || undefined,
          bairro,
          cidade,
          uf,
          cep: cep.replace(/\D/g, ""),
        },
        geo: {
          latitude,
          longitude,
          raioValidacaoMetros: parseInt(raioMetros),
        },
      };

      const validado = CriarObraSchema.safeParse(data);
      if (!validado.success) {
        const errorMsg = validado.error.errors[0]?.message || "Dados inválidos";
        setError(errorMsg);
        await haptics.error();
        return;
      }

      const token = await SecureStore.getItemAsync("accessToken");
      const resultado = await requestWithCsrf<{ obraId: string }>(
        "/api/v1/obras",
        "POST",
        validado.data,
        token ?? undefined
      );

      await haptics.success();
      Alert.alert("Sucesso", "Obra criada com sucesso!", [
        {
          text: "OK",
          onPress: () => {
            router.push({
              pathname: "/(tabs)/obras/[id]",
              params: { id: resultado.obraId },
            });
          },
        },
      ]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erro ao criar obra";
      setError(message);
      await haptics.error();
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }, [
    nome,
    areaM2,
    dataConclusalso,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    cep,
    latitude,
    longitude,
    raioMetros,
  ]);

  const isFormValid =
    nome.trim() &&
    areaM2 &&
    dataConclusalso &&
    logradouro &&
    numero &&
    bairro &&
    cidade &&
    cep &&
    latitude &&
    longitude;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Nova Obra</Text>
        <Text style={styles.subtitle}>Preencha os dados da sua obra</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>

          <View style={styles.formField}>
            <Text style={styles.label}>Nome da Obra*</Text>
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={setNome}
              placeholder="Ex: Residência João Silva"
              editable={!loading}
              accessibilityLabel="Nome da obra"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Área (m²)*</Text>
            <TextInput
              style={styles.input}
              value={areaM2}
              onChangeText={setAreaM2}
              placeholder="Ex: 150"
              keyboardType="decimal-pad"
              editable={!loading}
              accessibilityLabel="Área em metros quadrados"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Data de Conclusão Prevista*</Text>
            <TextInput
              style={styles.input}
              value={dataConclusalso}
              onChangeText={setDataConclusaoPrevista}
              placeholder="YYYY-MM-DD"
              editable={!loading}
              accessibilityLabel="Data de conclusão prevista"
            />
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localização</Text>

          <View style={styles.formField}>
            <Text style={styles.label}>Logradouro*</Text>
            <TextInput
              style={styles.input}
              value={logradouro}
              onChangeText={setLogradouro}
              placeholder="Rua, Avenida, etc"
              editable={!loading}
              accessibilityLabel="Logradouro"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formField, { flex: 2 }]}>
              <Text style={styles.label}>Número*</Text>
              <TextInput
                style={styles.input}
                value={numero}
                onChangeText={setNumero}
                placeholder="123"
                keyboardType="number-pad"
                editable={!loading}
                accessibilityLabel="Número"
              />
            </View>
            <View style={[styles.formField, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Complemento</Text>
              <TextInput
                style={styles.input}
                value={complemento}
                onChangeText={setComplemento}
                placeholder="Apto, loja"
                editable={!loading}
                accessibilityLabel="Complemento"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.formField, { flex: 2 }]}>
              <Text style={styles.label}>Bairro*</Text>
              <TextInput
                style={styles.input}
                value={bairro}
                onChangeText={setBairro}
                placeholder="Centro"
                editable={!loading}
                accessibilityLabel="Bairro"
              />
            </View>
            <View style={[styles.formField, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Estado*</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowUfModal(true)}
                disabled={loading}
              >
                <Text style={{ color: uf ? "#111827" : "#9ca3af" }}>
                  {uf || "Selecione"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.formField, { flex: 2 }]}>
              <Text style={styles.label}>Cidade*</Text>
              <TextInput
                style={styles.input}
                value={cidade}
                onChangeText={setCidade}
                placeholder="São Paulo"
                editable={!loading}
                accessibilityLabel="Cidade"
              />
            </View>
            <View style={[styles.formField, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>CEP*</Text>
              <TextInput
                style={styles.input}
                value={cep}
                onChangeText={(v) =>
                  setCep(v.replace(/\D/g, "").slice(0, 8))
                }
                placeholder="01310100"
                keyboardType="number-pad"
                maxLength={8}
                editable={!loading}
                accessibilityLabel="CEP"
              />
            </View>
          </View>
        </View>

        {/* GPS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Geolocalização</Text>

          {geoError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{geoError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.gpsButton}
            onPress={handleGetLocation}
            disabled={loading}
            accessibilityLabel="Obter localização GPS"
            accessibilityRole="button"
          >
            <Text style={styles.gpsButtonText}>📍 Obter Localização GPS</Text>
          </TouchableOpacity>

          {latitude && longitude && (
            <View style={styles.gpsResult}>
              <Text style={styles.gpsResultLabel}>Latitude</Text>
              <Text style={styles.gpsResultValue}>
                {latitude.toFixed(6)}
              </Text>
              <Text style={styles.gpsResultLabel}>Longitude</Text>
              <Text style={styles.gpsResultValue}>
                {longitude.toFixed(6)}
              </Text>
            </View>
          )}

          <View style={styles.formField}>
            <Text style={styles.label}>Raio de Validação (metros)</Text>
            <TextInput
              style={styles.input}
              value={raioMetros}
              onChangeText={setRaioMetros}
              placeholder="80"
              keyboardType="number-pad"
              editable={!loading}
              accessibilityLabel="Raio de validação"
            />
            <Text style={styles.helperText}>
              Distância máxima permitida para upload de evidências
            </Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (!isFormValid || loading) && styles.primaryButtonDisabled,
        ]}
        onPress={handleCriarObra}
        disabled={!isFormValid || loading}
        accessibilityLabel="Criar Obra"
        accessibilityRole="button"
        accessibilityState={{ disabled: !isFormValid || loading }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Criar Obra</Text>
        )}
      </TouchableOpacity>

      {/* UF Modal */}
      <Modal visible={showUfModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o Estado</Text>
              <TouchableOpacity
                onPress={() => setShowUfModal(false)}
                accessibilityLabel="Fechar"
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={ESTADOS}
              keyExtractor={(item) => item}
              numColumns={3}
              columnWrapperStyle={styles.ufGrid}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.ufButton,
                    uf === item && styles.ufButtonActive,
                  ]}
                  onPress={() => {
                    setUf(item);
                    setShowUfModal(false);
                    haptics.tap();
                  }}
                >
                  <Text
                    style={[
                      styles.ufButtonText,
                      uf === item && styles.ufButtonTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 20, paddingBottom: 120 },
  title: { fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 16 },
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  formField: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
  },
  helperText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 12,
  },
  gpsButton: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  gpsButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  gpsResult: {
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
  },
  gpsResultLabel: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "500",
    marginBottom: 4,
  },
  gpsResultValue: {
    fontSize: 14,
    color: "#047857",
    fontWeight: "600",
    marginBottom: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalClose: {
    fontSize: 24,
    color: "#6b7280",
  },
  ufGrid: {
    justifyContent: "space-between",
    marginBottom: 8,
  },
  ufButton: {
    width: "31%",
    paddingVertical: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  ufButtonActive: {
    backgroundColor: "#16a34a",
    borderColor: "#15803d",
  },
  ufButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  ufButtonTextActive: {
    color: "#fff",
  },
});
