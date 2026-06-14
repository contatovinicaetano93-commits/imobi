import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authApi } from "../../lib/api";

export default function EsqueciSenhaScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleEnviar = async () => {
    const e = email.trim().toLowerCase();
    if (!e.includes("@")) { Alert.alert("E-mail inválido"); return; }
    setLoading(true);
    try {
      await authApi.esqueceuSenha(e);
      setEnviado(true);
    } catch {
      // Retorna sucesso mesmo se e-mail não existe (segurança)
      setEnviado(true);
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
        <Text style={s.titulo}>Esqueci minha senha</Text>

        {!enviado ? (
          <>
            <Text style={s.sub}>
              Informe o e-mail da sua conta e enviaremos um link para redefinir sua senha.
            </Text>
            <TextInput
              style={s.input}
              placeholder="seu@email.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleEnviar}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Enviar link de recuperação</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={s.linkBtn} onPress={() => router.push("/(auth)/redefinir-senha" as any)}>
              <Text style={s.link}>Já tenho o código</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={s.successIcon}>
              <Ionicons name="mail-outline" size={40} color="#16a34a" />
            </View>
            <Text style={s.successText}>
              Se este e-mail estiver cadastrado, você receberá as instruções em breve. Verifique também a caixa de spam.
            </Text>
            <TouchableOpacity style={s.btn} onPress={() => router.push("/(auth)/redefinir-senha" as any)}>
              <Text style={s.btnText}>Inserir código recebido</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.linkBtn} onPress={() => router.back()}>
              <Text style={s.link}>Voltar ao login</Text>
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
  sub: { fontSize: 14, color: "#6b7280", lineHeight: 22, marginBottom: 24 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14, fontSize: 15, color: "#111827", marginBottom: 14 },
  btn: { backgroundColor: "#16a34a", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  linkBtn: { alignItems: "center", padding: 8 },
  link: { color: "#2563eb", fontSize: 14, fontWeight: "500" },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#dcfce7", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  successText: { fontSize: 14, color: "#6b7280", lineHeight: 22, marginBottom: 24 },
});
