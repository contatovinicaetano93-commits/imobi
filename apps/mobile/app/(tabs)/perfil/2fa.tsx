import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Image,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { apiClient } from "@imbobi/core";
import * as SecureStore from "expo-secure-store";

async function getToken() {
  return SecureStore.getItemAsync("accessToken");
}

type PerfisUsuario = { totpAtivo: boolean };

export default function Configurar2faScreen() {
  const router = useRouter();
  const [totpAtivo, setTotpAtivo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"idle" | "qrcode" | "confirmar" | "desativar">("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await apiClient.get<PerfisUsuario>("/api/v1/usuarios/meu-perfil", token ?? undefined);
        setTotpAtivo((data as any).totpAtivo ?? false);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const iniciarAtivacao = async () => {
    setWorking(true);
    try {
      const token = await getToken();
      const res = await apiClient.post<{ qrCode: string }>("/api/v1/auth/2fa/ativar", {}, token ?? undefined);
      setQrCode(res.qrCode);
      setStep("qrcode");
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível iniciar a configuração.");
    } finally {
      setWorking(false);
    }
  };

  const confirmarAtivacao = async () => {
    if (codigo.length !== 6) {
      Alert.alert("Código inválido", "Digite os 6 dígitos do seu app autenticador.");
      return;
    }
    setWorking(true);
    try {
      const token = await getToken();
      await apiClient.post("/api/v1/auth/2fa/confirmar", { totpCode: codigo }, token ?? undefined);
      setTotpAtivo(true);
      setStep("idle");
      setCodigo("");
      Alert.alert("2FA ativado", "Verificação em dois fatores ativada com sucesso.");
    } catch (e: any) {
      Alert.alert("Código inválido", e.message ?? "Verifique o código e tente novamente.");
      setCodigo("");
    } finally {
      setWorking(false);
    }
  };

  const desativar = async () => {
    if (codigo.length !== 6) {
      Alert.alert("Código inválido", "Digite o código do autenticador.");
      return;
    }
    if (senha.length < 8) {
      Alert.alert("Senha necessária", "Digite sua senha para confirmar.");
      return;
    }
    setWorking(true);
    try {
      const token = await getToken();
      await apiClient.post("/api/v1/auth/2fa/desativar", { totpCode: codigo, senha }, token ?? undefined);
      setTotpAtivo(false);
      setStep("idle");
      setCodigo("");
      setSenha("");
      Alert.alert("2FA desativado", "Verificação em dois fatores removida.");
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível desativar.");
      setCodigo("");
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Verificação em 2 etapas</Text>

      <View style={[styles.statusBanner, totpAtivo ? styles.bannerAtivo : styles.bannerInativo]}>
        <Text style={[styles.statusText, totpAtivo ? styles.statusAtivo : styles.statusInativo]}>
          {totpAtivo ? "2FA ativado" : "2FA desativado"}
        </Text>
        <Text style={styles.statusSub}>
          {totpAtivo
            ? "Sua conta está protegida com autenticação de dois fatores."
            : "Recomendamos ativar o 2FA para proteger sua conta."}
        </Text>
      </View>

      {step === "idle" && !totpAtivo && (
        <TouchableOpacity style={styles.btn} onPress={iniciarAtivacao} disabled={working}>
          {working ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Ativar 2FA</Text>}
        </TouchableOpacity>
      )}

      {step === "idle" && totpAtivo && (
        <TouchableOpacity style={styles.btnDanger} onPress={() => setStep("desativar")} disabled={working}>
          <Text style={styles.btnDangerText}>Desativar 2FA</Text>
        </TouchableOpacity>
      )}

      {step === "qrcode" && qrCode && (
        <View style={styles.qrBlock}>
          <Text style={styles.instrucao}>
            1. Abra o Google Authenticator ou Authy{"\n"}
            2. Escaneie o QR code abaixo{"\n"}
            3. Digite o código gerado para confirmar
          </Text>
          <Image source={{ uri: qrCode }} style={styles.qr} resizeMode="contain" />
          <Text style={styles.fieldLabel}>Código de 6 dígitos</Text>
          <TextInput
            style={styles.codeInput}
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#9ca3af"
            textAlign="center"
            autoFocus
          />
          <TouchableOpacity
            style={[styles.btn, (working || codigo.length !== 6) && styles.btnDisabled]}
            onPress={confirmarAtivacao}
            disabled={working || codigo.length !== 6}
          >
            {working ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Confirmar ativação</Text>}
          </TouchableOpacity>
        </View>
      )}

      {step === "desativar" && (
        <View style={styles.desativarBlock}>
          <Text style={styles.instrucao}>
            Para desativar o 2FA, confirme seu código do autenticador e sua senha.
          </Text>
          <Text style={styles.fieldLabel}>Código do autenticador</Text>
          <TextInput
            style={styles.codeInput}
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#9ca3af"
            textAlign="center"
            autoFocus
          />
          <Text style={styles.fieldLabel}>Senha da conta</Text>
          <TextInput
            style={styles.input}
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            placeholder="Sua senha"
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity
            style={[styles.btnDanger, working && styles.btnDisabled]}
            onPress={desativar}
            disabled={working}
          >
            {working ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnDangerText}>Confirmar desativação</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setStep("idle"); setCodigo(""); setSenha(""); }}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, paddingBottom: 40, gap: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { marginBottom: 4 },
  backText: { color: "#16a34a", fontSize: 15, fontWeight: "600" },
  titulo: { fontSize: 22, fontWeight: "700", color: "#111827" },
  statusBanner: { borderRadius: 14, padding: 16, gap: 6 },
  bannerAtivo: { backgroundColor: "#dcfce7" },
  bannerInativo: { backgroundColor: "#f3f4f6" },
  statusText: { fontSize: 16, fontWeight: "700" },
  statusAtivo: { color: "#15803d" },
  statusInativo: { color: "#374151" },
  statusSub: { fontSize: 14, color: "#4b5563", lineHeight: 20 },
  btn: { backgroundColor: "#16a34a", borderRadius: 14, padding: 16, alignItems: "center" },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnDanger: { backgroundColor: "#dc2626", borderRadius: 14, padding: 16, alignItems: "center" },
  btnDangerText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  qrBlock: { gap: 14 },
  qr: { width: "100%", height: 220, alignSelf: "center" },
  instrucao: { fontSize: 14, color: "#374151", lineHeight: 22 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  codeInput: { borderWidth: 2, borderColor: "#16a34a", borderRadius: 14, padding: 16, fontSize: 28, fontWeight: "700", color: "#111827", letterSpacing: 12 },
  desativarBlock: { gap: 12 },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, fontSize: 15, color: "#111827" },
  cancelText: { textAlign: "center", color: "#6b7280", fontSize: 14, marginTop: 4 },
});
