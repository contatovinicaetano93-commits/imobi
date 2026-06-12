import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { LoginSchema, type LoginInput } from "@imbobi/schemas";
import { apiClient } from "@imbobi/core";

export default function LoginScreen() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await apiClient.post<{ accessToken: string; refreshToken: string }>("/auth/login", data);
      await SecureStore.setItemAsync("accessToken", res.accessToken);
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
      router.replace("/(tabs)/obras");
    } catch (e: any) {
      Alert.alert("Erro de autenticação", e.message ?? "E-mail ou senha inválidos.");
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>I</Text>
        </View>
        <Text style={styles.logo}>Imobi</Text>
        <Text style={styles.subtitle}>Acesse sua conta</Text>
      </View>

      <View style={styles.card}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="seu@email.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onChangeText={onChange}
                value={value}
                editable={!isSubmitting}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="senha"
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={[styles.input, errors.senha && styles.inputError]}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                autoComplete="password"
                onChangeText={onChange}
                value={value}
                editable={!isSubmitting}
              />
              {errors.senha && <Text style={styles.errorText}>{errors.senha.message}</Text>}
            </View>
          )}
        />

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Entrar</Text>
          }
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push("/(auth)/cadastro")} disabled={isSubmitting}>
        <Text style={styles.link}>Não tem conta? <Text style={styles.linkBold}>Cadastre-se</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#EFF3FF" },
  container: { flexGrow: 1, padding: 24, justifyContent: "center", gap: 24 },
  header: { alignItems: "center", gap: 8 },
  logoMark: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: "#1B4FD8", alignItems: "center", justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#1B4FD8", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  logoMarkText: { fontSize: 32, fontWeight: "800", color: "#fff" },
  logo: { fontSize: 32, fontWeight: "800", color: "#1B4FD8", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: "#64748B", fontWeight: "500" },
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 24, gap: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginLeft: 2 },
  input: {
    borderWidth: 1.5, borderColor: "#CBD5E1", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: "#0F172A", backgroundColor: "#F8FAFC",
  },
  inputError: { borderColor: "#EF4444", backgroundColor: "#FFF5F5" },
  errorText: { color: "#EF4444", fontSize: 12, fontWeight: "500", marginLeft: 2 },
  button: {
    backgroundColor: "#1B4FD8", borderRadius: 12, paddingVertical: 15,
    alignItems: "center", marginTop: 4,
    shadowColor: "#1B4FD8", shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.65, shadowOpacity: 0 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  link: { textAlign: "center", color: "#64748B", fontSize: 14 },
  linkBold: { color: "#1B4FD8", fontWeight: "700" },
});
