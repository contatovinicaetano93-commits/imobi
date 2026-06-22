import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import ScreenHeader from "../../../components/ScreenHeader";
import FlowGateBanner from "../../../components/FlowGateBanner";
import KeyboardAwareScroll from "../../../components/KeyboardAwareScroll";
import { obrasApi, creditoApi, fluxoApi, type FluxoStatus } from "../../../lib/api";
import { proximoPassoFluxo } from "../../../lib/flow-gates";

const C = { blue: "#1B4FD8", bluePale: "#EEF3FF", ink: "#0F172A", gray: "#64748B", border: "#E2E8F0", white: "#FFFFFF", surface: "#F8FAFC" };

export default function CadastrarObraScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [nome, setNome] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cep, setCep] = useState("");
  const [areaM2, setAreaM2] = useState("");
  const [creditoId, setCreditoId] = useState<string | undefined>();
  const [creditos, setCreditos] = useState<{ creditoId: string; label: string }[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [fluxo, setFluxo] = useState<FluxoStatus | null>(null);

  const gate = proximoPassoFluxo(fluxo);
  const kycBloqueado = fluxo !== null && !fluxo.kycUsuarioCompleto;

  useEffect(() => {
    fluxoApi.status().then(setFluxo).catch(() => null);
  }, []);

  const carregarCreditos = async () => {
    try {
      const list = await creditoApi.meus();
      setCreditos(list.filter((c) => c.status === "ATIVO").map((c) => ({
        creditoId: c.creditoId,
        label: `Crédito ${c.creditoId.slice(0, 8)}…`,
      })));
    } catch { /* optional */ }
  };

  const validarStep1 = () => {
    const area = Number(areaM2.replace(",", "."));
    const cepLimpo = cep.replace(/\D/g, "");
    if (nome.trim().length < 3) { Alert.alert("Nome inválido", "Informe o nome da obra (mín. 3 caracteres)."); return false; }
    if (!logradouro.trim() || !bairro.trim() || !cidade.trim() || uf.length !== 2 || cepLimpo.length !== 8) {
      Alert.alert("Endereço incompleto", "Preencha logradouro, bairro, cidade, UF e CEP."); return false;
    }
    if (!area || area <= 0) { Alert.alert("Área inválida", "Informe a área em m²."); return false; }
    return true;
  };

  const handleContinuar = async () => {
    if (!validarStep1()) return;
    await carregarCreditos();
    setStep(2);
  };

  const handleSalvar = async () => {
    if (!validarStep1()) return;
    if (kycBloqueado) {
      Alert.alert("KYC pendente", "Complete a verificação de identidade em Documentos antes de cadastrar uma obra.");
      return;
    }
    setSalvando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("GPS necessário", "Permita a localização para cadastrar a obra.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const dataConclusao = new Date();
      dataConclusao.setFullYear(dataConclusao.getFullYear() + 1);
      const area = Number(areaM2.replace(",", "."));

      const obra = await obrasApi.criar({
        nome: nome.trim(),
        endereco: {
          logradouro: logradouro.trim(), numero: numero.trim() || "S/N",
          bairro: bairro.trim(), cidade: cidade.trim(),
          uf: uf.trim().toUpperCase(), cep: cep.replace(/\D/g, ""),
        },
        geo: { latitude: loc.coords.latitude, longitude: loc.coords.longitude, raioValidacaoMetros: 80 },
        areaM2: area,
        dataConclusaoPrevistaISO: dataConclusao.toISOString(),
        creditoId,
      });

      const etapa = obra.etapas?.find((e) => e.status === "PLANEJADA" || e.status === "EM_EXECUCAO") ?? obra.etapas?.[0];

      Alert.alert("Obra cadastrada!", `"${obra.nome}" foi registrada com ${obra.etapas?.length ?? 0} etapas padrão.`, [
        {
          text: "Registrar evidência",
          onPress: () => {
            if (etapa) {
              router.replace({
                pathname: "/obras/[id]/registrar",
                params: {
                  id: obra.obraId, etapaId: etapa.etapaId, etapaNome: etapa.nome,
                  geoLat: String(obra.geoLatitude), geoLng: String(obra.geoLongitude),
                  raio: String(obra.raioValidacaoMetros || 80),
                },
              });
            } else {
              router.replace(`/obras/${obra.obraId}`);
            }
          },
        },
        { text: "Ver obra", onPress: () => router.replace(`/obras/${obra.obraId}`) },
        { text: "Início", style: "cancel", onPress: () => router.replace("/(tabs)/obras") },
      ]);
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível cadastrar a obra.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Cadastrar obra"
        subtitle={step === 1 ? "Dados da obra + endereço GPS" : "Confirmação"}
        onBack={() => step === 2 ? setStep(1) : router.back()}
      />

      <KeyboardAwareScroll contentContainerStyle={styles.form}>
        {gate && <FlowGateBanner {...gate} />}

        {step === 1 ? (
          <>
            <Text style={styles.label}>Nome da obra *</Text>
            <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Residencial Solar" />

            <Text style={styles.section}>Endereço</Text>
            <Text style={styles.label}>Logradouro *</Text>
            <TextInput style={styles.input} value={logradouro} onChangeText={setLogradouro} placeholder="Rua, avenida..." />
            <View style={styles.row}>
              <View style={{ flex: 1 }}><Text style={styles.label}>Número</Text>
                <TextInput style={styles.input} value={numero} onChangeText={setNumero} placeholder="123" /></View>
              <View style={{ flex: 1 }}><Text style={styles.label}>CEP *</Text>
                <TextInput style={styles.input} value={cep} onChangeText={setCep} keyboardType="number-pad" maxLength={8} /></View>
            </View>
            <Text style={styles.label}>Bairro *</Text>
            <TextInput style={styles.input} value={bairro} onChangeText={setBairro} />
            <View style={styles.row}>
              <View style={{ flex: 2 }}><Text style={styles.label}>Cidade *</Text>
                <TextInput style={styles.input} value={cidade} onChangeText={setCidade} /></View>
              <View style={{ flex: 1 }}><Text style={styles.label}>UF *</Text>
                <TextInput style={styles.input} value={uf} onChangeText={setUf} maxLength={2} autoCapitalize="characters" /></View>
            </View>
            <Text style={styles.label}>Área (m²) *</Text>
            <TextInput style={styles.input} value={areaM2} onChangeText={setAreaM2} keyboardType="decimal-pad" placeholder="120" />

            <TouchableOpacity style={styles.btn} onPress={handleContinuar}>
              <Text style={styles.btnText}>Continuar →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.stepHint}>Confirme e vincule crédito (opcional). GPS será capturado ao salvar.</Text>
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>{nome}</Text>
              <Text style={styles.summarySub}>{logradouro}, {bairro} — {cidade}/{uf.toUpperCase()}</Text>
              <Text style={styles.summarySub}>{areaM2} m²</Text>
            </View>

            {creditos.length > 0 && (
              <>
                <Text style={styles.section}>Vincular crédito (opcional)</Text>
                {creditos.map((c) => (
                  <TouchableOpacity key={c.creditoId} style={[styles.credChip, creditoId === c.creditoId && styles.credChipActive]}
                    onPress={() => setCreditoId(creditoId === c.creditoId ? undefined : c.creditoId)}>
                    <Text style={[styles.credChipText, creditoId === c.creditoId && styles.credChipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={styles.gpsInfo}>
              <Ionicons name="location" size={20} color={C.blue} />
              <Text style={styles.gpsText}>Localização GPS será registrada automaticamente para validação de evidências.</Text>
            </View>

            <TouchableOpacity style={[styles.btn, salvando && styles.btnDisabled, kycBloqueado && styles.btnDisabled]} onPress={handleSalvar} disabled={salvando || kycBloqueado}>
              {salvando ? <ActivityIndicator color={C.white} /> : <Text style={styles.btnText}>Confirmar e cadastrar obra</Text>}
            </TouchableOpacity>
          </>
        )}
      </KeyboardAwareScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  form: { padding: 20, gap: 6, paddingBottom: 40 },
  stepHint: { fontSize: 13, color: C.gray, lineHeight: 18, marginBottom: 8 },
  section: { fontSize: 16, fontWeight: "700", color: C.ink, marginTop: 12, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: "600", color: C.gray, marginTop: 8 },
  input: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink },
  row: { flexDirection: "row", gap: 12 },
  btn: { backgroundColor: C.blue, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 20 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: C.white, fontSize: 16, fontWeight: "700" },
  summary: { backgroundColor: C.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 4, marginBottom: 8 },
  summaryTitle: { fontSize: 17, fontWeight: "700", color: C.ink },
  summarySub: { fontSize: 13, color: C.gray },
  credChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: C.border, alignSelf: "flex-start", marginBottom: 8 },
  credChipActive: { backgroundColor: C.bluePale, borderColor: C.blue },
  credChipText: { fontSize: 13, color: C.gray, fontWeight: "600" },
  credChipTextActive: { color: C.blue },
  gpsInfo: { flexDirection: "row", gap: 10, backgroundColor: C.bluePale, padding: 14, borderRadius: 12, marginTop: 8, alignItems: "flex-start" },
  gpsText: { flex: 1, fontSize: 13, color: C.ink, lineHeight: 18 },
});
