import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { CadastroUsuarioSchema, type CadastroUsuarioInput } from "@imbobi/schemas";
import { apiClient } from "@imbobi/core";
import { notifySignedIn } from "../../lib/api";
import { resolvePostLoginRoute } from "../../lib/jornada";

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatTelefone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export default function CadastroScreen() {
  const router = useRouter();
  const [showSenha, setShowSenha] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<CadastroUsuarioInput>({
    resolver: zodResolver(CadastroUsuarioSchema),
  });

  const onSubmit = async (data: CadastroUsuarioInput) => {
    try {
      const res = await apiClient.post<{ accessToken: string; refreshToken: string }>(
        "/auth/registrar",
        data
      );
      await SecureStore.setItemAsync("accessToken", res.accessToken);
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
      const dest = await resolvePostLoginRoute();
      router.replace(dest as never);
      notifySignedIn();
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Falha no cadastro. Tente novamente.");
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.logo}>Imobi</Text>
      <Text style={styles.subtitle}>Crie sua conta</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Nome completo</Text>
        <Controller
          control={control}
          name="nome"
          render={({ field: { onChange, value } }) => (
            <>
              <TextInput
                style={[styles.input, errors.nome && styles.inputError]}
                placeholder="Ex: João da Silva"
                autoCapitalize="words"
                onChangeText={onChange}
                value={value}
                editable={!isSubmitting}
                placeholderTextColor="#9ca3af"
              />
              {errors.nome
                ? <Text style={styles.errorText}>{errors.nome.message}</Text>
                : <Text style={styles.hint}>Digite seu nome completo</Text>}
            </>
          )}
        />
      </View>

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
              {errors.email
                ? <Text style={styles.errorText}>{errors.email.message}</Text>
                : <Text style={styles.hint}>Será usado para fazer login</Text>}
            </>
          )}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>CPF</Text>
        <Controller
          control={control}
          name="cpf"
          render={({ field: { onChange, value } }) => (
            <>
              <TextInput
                style={[styles.input, errors.cpf && styles.inputError]}
                placeholder="000.000.000-00"
                keyboardType="numeric"
                maxLength={14}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, "").slice(0, 11);
                  onChange(digits);
                }}
                value={value ? formatCpf(value) : ""}
                editable={!isSubmitting}
                placeholderTextColor="#9ca3af"
              />
              {errors.cpf
                ? <Text style={styles.errorText}>{errors.cpf.message}</Text>
                : <Text style={styles.hint}>Digite apenas os 11 números do seu CPF</Text>}
            </>
          )}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Telefone</Text>
        <Controller
          control={control}
          name="telefone"
          render={({ field: { onChange, value } }) => (
            <>
              <TextInput
                style={[styles.input, errors.telefone && styles.inputError]}
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
                maxLength={15}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, "").slice(0, 11);
                  onChange(digits);
                }}
                value={value ? formatTelefone(value) : ""}
                editable={!isSubmitting}
                placeholderTextColor="#9ca3af"
              />
              {errors.telefone
                ? <Text style={styles.errorText}>{errors.telefone.message}</Text>
                : <Text style={styles.hint}>DDD + número com 10 ou 11 dígitos</Text>}
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
                  placeholder="Mínimo 8 caracteres"
                  secureTextEntry={!showSenha}
                  autoComplete="new-password"
                  onChangeText={onChange}
                  value={value}
                  editable={!isSubmitting}
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity onPress={() => setShowSenha(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showSenha ? "eye-off" : "eye"} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              {errors.senha
                ? <Text style={styles.errorText}>{errors.senha.message}</Text>
                : <Text style={styles.hint}>Use letras, números e símbolos para maior segurança</Text>}
            </>
          )}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonLoading]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Criar conta</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
        <Text style={styles.link}>Já tem conta? Faça login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 28, paddingTop: 56, paddingBottom: 40 },
  logo: { fontSize: 36, fontWeight: "800", color: "#1d4ed8", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#6b7280", textAlign: "center", marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, padding: 14, fontSize: 15, color: "#111827" },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, paddingHorizontal: 14 },
  inputFlex: { flex: 1, paddingVertical: 14, fontSize: 15, color: "#111827" },
  eyeBtn: { padding: 4 },
  inputError: { borderColor: "#ef4444" },
  hint: { color: "#9ca3af", fontSize: 11, marginTop: 4 },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 4 },
  button: { backgroundColor: "#1d4ed8", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  buttonLoading: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { textAlign: "center", color: "#1d4ed8", fontSize: 14, fontWeight: "500", marginTop: 12 },
});
