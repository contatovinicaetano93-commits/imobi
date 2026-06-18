import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { CadastroUsuarioSchema, type CadastroUsuarioInput } from "@imbobi/schemas";
import { apiClient } from "@imbobi/core";
import { emitAuthState } from "../../lib/auth-state";

export default function CadastroScreen() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<CadastroUsuarioInput>({
    resolver: zodResolver(CadastroUsuarioSchema),
    defaultValues: {
      consentidoTermos: false,
      consentidoPrivacy: false,
      consentidoKyc: false,
      consentidoMarketing: false,
    },
  });

  const onSubmit = async (data: CadastroUsuarioInput) => {
    try {
      const res = await apiClient.post<{ accessToken: string; refreshToken: string }>(
        "/auth/registrar",
        data
      );
      await SecureStore.setItemAsync("accessToken", res.accessToken);
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
      emitAuthState(true);
      router.replace("/(tabs)/obras");
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Falha no cadastro. Tente novamente.");
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.logo}>imbobi</Text>
      <Text style={styles.subtitle}>Crie sua conta</Text>

      <Controller
        control={control}
        name="nome"
        render={({ field: { onChange, value } }) => (
          <>
            <TextInput
              style={[styles.input, errors.nome && styles.inputError]}
              placeholder="Nome completo"
              autoCapitalize="words"
              onChangeText={onChange}
              value={value}
              editable={!isSubmitting}
            />
            {errors.nome && <Text style={styles.errorText}>{errors.nome.message}</Text>}
          </>
        )}
      />

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
            />
            {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
          </>
        )}
      />

      <Controller
        control={control}
        name="cpf"
        render={({ field: { onChange, value } }) => (
          <>
            <TextInput
              style={[styles.input, errors.cpf && styles.inputError]}
              placeholder="CPF (11 dígitos)"
              keyboardType="numeric"
              maxLength={11}
              onChangeText={onChange}
              value={value}
              editable={!isSubmitting}
            />
            {errors.cpf && <Text style={styles.errorText}>{errors.cpf.message}</Text>}
          </>
        )}
      />

      <Controller
        control={control}
        name="telefone"
        render={({ field: { onChange, value } }) => (
          <>
            <TextInput
              style={[styles.input, errors.telefone && styles.inputError]}
              placeholder="Telefone (10-11 dígitos)"
              keyboardType="phone-pad"
              maxLength={11}
              onChangeText={onChange}
              value={value}
              editable={!isSubmitting}
            />
            {errors.telefone && <Text style={styles.errorText}>{errors.telefone.message}</Text>}
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
              placeholder="Senha (mín. 8 caracteres)"
              secureTextEntry
              onChangeText={onChange}
              value={value}
              editable={!isSubmitting}
            />
            {errors.senha && <Text style={styles.errorText}>{errors.senha.message}</Text>}
          </>
        )}
      />

      <Controller
        control={control}
        name="consentidoTermos"
        render={({ field: { onChange, value } }) => (
          <>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => onChange(!value)}
              disabled={isSubmitting}
            >
              <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                {value && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>Aceito os termos de uso da IMOBI.</Text>
            </TouchableOpacity>
            {errors.consentidoTermos && <Text style={styles.errorText}>{errors.consentidoTermos.message}</Text>}
          </>
        )}
      />

      <Controller
        control={control}
        name="consentidoPrivacy"
        render={({ field: { onChange, value } }) => (
          <>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => onChange(!value)}
              disabled={isSubmitting}
            >
              <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                {value && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>Aceito a política de privacidade.</Text>
            </TouchableOpacity>
            {errors.consentidoPrivacy && <Text style={styles.errorText}>{errors.consentidoPrivacy.message}</Text>}
          </>
        )}
      />

      <Controller
        control={control}
        name="consentidoKyc"
        render={({ field: { onChange, value } }) => (
          <>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => onChange(!value)}
              disabled={isSubmitting}
            >
              <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                {value && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>Autorizo validações cadastrais e KYC para análise de crédito.</Text>
            </TouchableOpacity>
            {errors.consentidoKyc && <Text style={styles.errorText}>{errors.consentidoKyc.message}</Text>}
          </>
        )}
      />

      <Controller
        control={control}
        name="consentidoMarketing"
        render={({ field: { onChange, value } }) => (
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => onChange(!value)}
            disabled={isSubmitting}
          >
            <View style={[styles.checkbox, value && styles.checkboxChecked]}>
              {value && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>Quero receber comunicações comerciais da IMOBI.</Text>
          </TouchableOpacity>
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
          <Text style={styles.buttonText}>Criar conta</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
        <Text style={styles.link}>Já tem conta? Faça login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 28, paddingTop: 56, gap: 12, paddingBottom: 40 },
  logo: { fontSize: 36, fontWeight: "800", color: "#16a34a", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#6b7280", textAlign: "center", marginBottom: 20 },
  input: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, padding: 14, fontSize: 15, color: "#111827" },
  inputError: { borderColor: "#ef4444" },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 4, marginBottom: 8 },
  checkboxRow: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  checkboxMark: { color: "#fff", fontSize: 14, fontWeight: "800" },
  checkboxText: { flex: 1, color: "#374151", fontSize: 13, lineHeight: 18 },
  button: { backgroundColor: "#16a34a", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  buttonLoading: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { textAlign: "center", color: "#16a34a", fontSize: 14, fontWeight: "500", marginTop: 12 },
});
