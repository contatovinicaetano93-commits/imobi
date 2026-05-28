import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { LoginSchema, type LoginInput } from "@imbobi/schemas";
import { requestWithCsrf } from "../../lib/api";
import { haptics } from "../../lib/haptics";

export default function LoginScreen() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await haptics.impact();
      const res = await requestWithCsrf<{ accessToken: string; refreshToken: string; csrfToken?: string }>(
        "/api/v1/auth/login",
        "POST",
        data
      );
      await SecureStore.setItemAsync("accessToken", res.accessToken);
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
      await haptics.success();
      router.replace("/(tabs)/obras");
    } catch {
      await haptics.error();
      Alert.alert(
        "Erro ao entrar",
        "E-mail ou senha inválidos. Verifique seus dados e tente novamente.",
        [{ text: "OK", onPress: () => {} }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>imbobi</Text>
      <Text style={styles.subtitle}>Acesse sua conta</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <View style={styles.fieldContainer}>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="E-mail"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={onChange}
              value={value}
              editable={!isSubmitting}
              accessibilityLabel="Campo de e-mail"
              accessibilityHint="Digite seu endereço de e-mail"
            />
            {errors.email && (
              <Text style={styles.errorMessage}>{errors.email.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="senha"
        render={({ field: { onChange, value } }) => (
          <View style={styles.fieldContainer}>
            <TextInput
              style={[styles.input, errors.senha && styles.inputError]}
              placeholder="Senha"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              onChangeText={onChange}
              value={value}
              editable={!isSubmitting}
              accessibilityLabel="Campo de senha"
              accessibilityHint="Digite sua senha"
            />
            {errors.senha && (
              <Text style={styles.errorMessage}>{errors.senha.message}</Text>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        accessibilityLabel="Entrar"
        accessibilityRole="button"
        accessibilityHint="Toca para fazer login"
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          haptics.tap();
          router.push("/(auth)/cadastro");
        }}
        accessibilityLabel="Cadastro"
        accessibilityRole="link"
        accessibilityHint="Toca para ir para a tela de cadastro"
      >
        <Text style={styles.link}>Não tem conta? Cadastre-se</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    justifyContent: "center",
    gap: 16,
  },
  logo: {
    fontSize: 36,
    fontWeight: "800",
    color: "#16a34a",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  fieldContainer: {
    gap: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  errorMessage: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "500",
    paddingLeft: 4,
  },
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: "#d1d5db",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  link: {
    textAlign: "center",
    color: "#16a34a",
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 8,
  },
});
