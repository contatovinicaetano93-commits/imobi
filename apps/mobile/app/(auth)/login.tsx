import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { LoginSchema, type LoginInput } from "@imbobi/schemas";
import { apiClient } from "@imbobi/core";
import { notifySignedIn } from "../../lib/api";
import { isBiometryAvailable, setBiometryEnabled } from "../../lib/biometry";
import { resolvePostLoginRoute } from "../../lib/jornada";
import { registerForPushNotifications } from "../../lib/push-notifications";

async function offerBiometrySetup() {
  const available = await isBiometryAvailable();
  if (!available) return;
  Alert.alert(
    "Desbloqueio rápido",
    "Usar Face ID ou digital para entrar no app nas próximas vezes?",
    [
      { text: "Agora não", style: "cancel" },
      { text: "Ativar", onPress: () => void setBiometryEnabled(true) },
    ]
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const [showSenha, setShowSenha] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await apiClient.post<{ accessToken: string; refreshToken: string }>(
        "/auth/login",
        data
      );
      await SecureStore.setItemAsync("accessToken", res.accessToken);
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
      const dest = await resolvePostLoginRoute();
      router.replace(dest as never);
      notifySignedIn();
      void registerForPushNotifications();
      await offerBiometrySetup();
    } catch (e: unknown) {
      Alert.alert("Erro de autenticação", e instanceof Error ? e.message : "E-mail ou senha inválidos.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Imobi</Text>
        <Text style={styles.subtitle}>Acesse sua conta</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>E-mail</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="Ex: joao@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onChangeText={onChange}
                  value={value}
                  editable={!isSubmitting}
                  placeholderTextColor="#9ca3af"
                />
                {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
              </>
            )}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Senha</Text>
          <Controller
            control={control}
            name="senha"
            render={({ field: { onChange, value } }) => (
              <>
                <View style={[styles.inputRow, errors.senha && styles.inputError]}>
                  <TextInput
                    style={styles.inputFlex}
                    placeholder="Digite sua senha"
                    secureTextEntry={!showSenha}
                    autoComplete="password"
                    onChangeText={onChange}
                    value={value}
                    editable={!isSubmitting}
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity onPress={() => setShowSenha(v => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showSenha ? "eye-off" : "eye"} size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
                {errors.senha && <Text style={styles.errorText}>{errors.senha.message}</Text>}
              </>
            )}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonLoading]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push("/(auth)/cadastro")} disabled={isSubmitting}>
        <Text style={styles.link}>Não tem conta? Cadastre-se</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 28, justifyContent: "space-between" },
  header: { justifyContent: "center", alignItems: "center", marginTop: 40 },
  logo: { fontSize: 44, fontWeight: "800", color: "#1d4ed8", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6b7280" },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
  input: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, padding: 14, fontSize: 15, color: "#111827" },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, paddingHorizontal: 14 },
  inputFlex: { flex: 1, paddingVertical: 14, fontSize: 15, color: "#111827" },
  eyeBtn: { padding: 4 },
  inputError: { borderColor: "#ef4444" },
  errorText: { color: "#ef4444", fontSize: 12 },
  button: { backgroundColor: "#1d4ed8", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  buttonLoading: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { textAlign: "center", color: "#1d4ed8", fontSize: 14, fontWeight: "500", marginBottom: 20 },
});
