import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "@imbobi/core";

export default function Verificar2faScreen() {
  const router = useRouter();
  const { tempToken } = useLocalSearchParams<{ tempToken: string }>();
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerificar = async () => {
    if (codigo.length !== 6) {
      Alert.alert("Código inválido", "Digite os 6 dígitos do seu app autenticador.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post<{ accessToken: string; refreshToken: string }>(
        "/auth/2fa/verificar",
        { tempToken, totpCode: codigo },
      );
      await SecureStore.setItemAsync("accessToken", res.accessToken);
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
      router.replace("/(tabs)/obras");
    } catch (e: any) {
      Alert.alert("Código inválido", e.message ?? "Verifique seu app autenticador e tente novamente.");
      setCodigo("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.titulo}>Verificação em 2 etapas</Text>
        <Text style={styles.subtitulo}>
          Abra seu app autenticador (Google Authenticator, Authy, etc.) e insira o código de 6 dígitos.
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          value={codigo}
          onChangeText={setCodigo}
          autoFocus
          editable={!loading}
          placeholderTextColor="#9ca3af"
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.button, (loading || codigo.length !== 6) && styles.buttonDisabled]}
          onPress={handleVerificar}
          disabled={loading || codigo.length !== 6}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Verificar</Text>
          }
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.back()} disabled={loading}>
        <Text style={styles.link}>Voltar ao login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 28, justifyContent: "space-between" },
  header: { alignItems: "center", marginTop: 60, gap: 12 },
  icon: { fontSize: 52 },
  titulo: { fontSize: 22, fontWeight: "700", color: "#111827", textAlign: "center" },
  subtitulo: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  form: { gap: 16 },
  input: {
    borderWidth: 2, borderColor: "#16a34a", borderRadius: 14,
    padding: 18, fontSize: 28, fontWeight: "700", color: "#111827",
    letterSpacing: 12,
  },
  button: { backgroundColor: "#16a34a", borderRadius: 14, padding: 16, alignItems: "center" },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { textAlign: "center", color: "#6b7280", fontSize: 14, marginBottom: 20 },
});
