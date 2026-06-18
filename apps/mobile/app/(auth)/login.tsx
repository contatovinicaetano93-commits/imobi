import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { getMobileRoleHome, LoginSchema, normalizeUserRole, type LoginInput } from "@imbobi/schemas";
import { apiClient } from "@imbobi/core";

export default function LoginScreen() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        usuario?: { tipo?: string | null };
      }>(
        "/auth/login",
        data
      );
      const role = normalizeUserRole(res.usuario?.tipo ?? null);
      await SecureStore.setItemAsync("accessToken", res.accessToken);
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
      if (role) await SecureStore.setItemAsync("userRole", role);
      router.replace(getMobileRoleHome(role) as any);
    } catch (e: any) {
      Alert.alert("Erro de autenticação", e.message ?? "E-mail ou senha inválidos.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>imbobi</Text>
        <Text style={styles.subtitle}>Acesse sua conta</Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="E-mail"
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={onChange}
                value={value}
                editable={!isSubmitting}
                placeholderTextColor="#9ca3af"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
            </>
          )}
        />

        <Controller
          control={control}
          name="senha"
          render={({ field: { onChange, value } }) => (
            <>
              <TextInput
                style={[styles.input, errors.senha && styles.inputError]}
                placeholder="Senha"
                secureTextEntry
                onChangeText={onChange}
                value={value}
                editable={!isSubmitting}
                placeholderTextColor="#9ca3af"
              />
              {errors.senha && <Text style={styles.errorText}>{errors.senha.message}</Text>}
            </>
          )}
        />

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonLoading]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
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
  logo: { fontSize: 44, fontWeight: "800", color: "#16a34a", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6b7280" },
  form: { gap: 16 },
  input: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, padding: 14, fontSize: 15, color: "#111827" },
  inputError: { borderColor: "#ef4444" },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: -12, marginBottom: 4 },
  button: { backgroundColor: "#16a34a", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  buttonLoading: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { textAlign: "center", color: "#16a34a", fontSize: 14, fontWeight: "500", marginBottom: 20 },
});
