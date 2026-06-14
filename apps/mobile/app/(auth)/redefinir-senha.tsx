import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authApi } from "../../lib/api";

export default function RedefinirSenhaScreen() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const handleRedefinir = async () => {
    if (!token.trim()) { Alert.alert("Informe o código recebido por e-mail."); return; }
    if (novaSenha.length < 8) { Alert.alert("A senha deve ter pelo menos 8 caracteres."); return; }
    if (novaSenha !== confirmar) { Alert.alert("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      await authApi.redefinirSenha(token.trim(), novaSenha);
      setConcluido(true);
    } catch {
      Alert.alert("Erro", "Código inválido ou expirado. Solicite um novo link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#374151" />
      </TouchableOpacity>

      <View style={s.content}>
        <Text style={s.titulo}>Redefinir senha</Text>

        {!concluido ? (
          <>
            <Text style={s.sub}>Cole o código recebido por e-mail e defina sua nova senha.</Text>

            <Text style={s.label}>Código de recuperação</Text>
            <TextInput
              style={s.input}
              placeholder="Cole o código aqui"
              placeholderTextColor="#9ca3af"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={s.label}>Nova senha</Text>
            <View style={s.senhaRow}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor="#9ca3af"
                value={novaSenha}
                onChangeText={setNovaSenha}
                secureTextEntry={!mostrarSenha}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setMostrarSenha((v) => !v)}>
                <Ionicons name={mostrarSenha ? "eye-off-outline" : "eye-outline"} size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Confirmar senha</Text>
            <TextInput
              style={s.input}
              placeholder="Repita a nova senha"
              placeholderTextColor="#9ca3af"
              value={confirmar}
              onChangeText={setConfirmar}
              secureTextEntry={!mostrarSenha}
            />

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleRedefinir}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Redefinir senha</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={s.successIcon}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#16a34a" />
            </View>
            <Text style={s.successTitulo}>Senha redefinida!</Text>
            <Text style={s.sub}>Sua senha foi alterada com sucesso. Faça login com a nova senha.</Text>
            <TouchableOpacity style={s.btn} onPress={() => router.replace("/(auth)/login")}>
              <Text style={s.btnText}>Ir para o login</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  back: { marginTop: 48, marginBottom: 8, padding: 4, alignSelf: "flex-start" },
  content: { flex: 1, paddingTop: 16 },
  titulo: { fontSize: 24, fontWeight: "700", color: "#1e3a5f", marginBottom: 12 },
  sub: { fontSize: 14, color: "#6b7280", lineHeight: 22, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14, fontSize: 15, color: "#111827", marginBottom: 14 },
  senhaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  eyeBtn: { padding: 14, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10 },
  btn: { backgroundColor: "#16a34a", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#dcfce7", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  successTitulo: { fontSize: 20, fontWeight: "700", color: "#1e3a5f", marginBottom: 8 },
});
