import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Platform, StatusBar,
  KeyboardAvoidingView, ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authApi } from "../../lib/api";

const C = { blue: "#1B4FD8", navy: "#0C1A3D", ink: "#0F172A", gray: "#64748B", border: "#E2E8F0", surface: "#F8FAFC", white: "#FFFFFF" };

export default function EsqueceuSenhaScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const enviar = async () => {
    if (!email.includes("@")) {
      Alert.alert("E-mail inválido", "Informe um e-mail válido.");
      return;
    }
    setLoading(true);
    try {
      await authApi.esqueceuSenha(email.trim().toLowerCase());
      Alert.alert(
        "E-mail enviado",
        "Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );
    } catch (e: unknown) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Recuperar senha</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <View style={styles.sheet}>
            <Text style={styles.title}>Esqueceu a senha?</Text>
            <Text style={styles.sub}>Informe seu e-mail cadastrado. Enviaremos um link para redefinição.</Text>

            <Text style={styles.label}>E-MAIL</Text>
            <TextInput style={styles.input} placeholder="seu@email.com.br" placeholderTextColor="#94A3B8"
              keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} editable={!loading} />

            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={enviar} disabled={loading}>
              {loading ? <ActivityIndicator color={C.white} /> : <Text style={styles.btnText}>Enviar link</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navy },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: Platform.OS === "ios" ? 56 : 36, paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center" },
  topTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: C.white },
  sheet: { flex: 1, backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: C.ink },
  sub: { fontSize: 14, color: C.gray, lineHeight: 20 },
  label: { fontSize: 10, fontWeight: "700", color: C.gray, letterSpacing: 0.8, marginTop: 8 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 15, color: C.ink },
  btn: { backgroundColor: C.blue, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 12 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: C.white, fontSize: 16, fontWeight: "700" },
});
