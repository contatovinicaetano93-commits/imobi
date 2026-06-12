import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { CadastroUsuarioSchema, type CadastroUsuarioInput } from "@imbobi/schemas";
import { apiClient } from "@imbobi/core";

export default function CadastroScreen() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<CadastroUsuarioInput>({
    resolver: zodResolver(CadastroUsuarioSchema),
  });

  const onSubmit = async (data: CadastroUsuarioInput) => {
    try {
      const res = await apiClient.post<{ accessToken: string; refreshToken: string }>("/auth/registrar", data);
      await SecureStore.setItemAsync("accessToken", res.accessToken);
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
      router.replace("/(tabs)/obras");
    } catch (e: any) {
      Alert.alert("Erro no cadastro", e.message ?? "Falha ao criar conta. Tente novamente.");
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>I</Text>
        </View>
        <Text style={styles.logo}>Imobi</Text>
        <Text style={styles.subtitle}>Crie sua conta gratuitamente</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dados pessoais</Text>

        <Controller
          control={control}
          name="nome"
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                style={[styles.input, errors.nome && styles.inputError]}
                placeholder="Como você se chama"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                autoComplete="name"
                onChangeText={onChange}
                value={value}
                editable={!isSubmitting}
              />
              {errors.nome && <Text style={styles.errorText}>{errors.nome.message}</Text>}
            </View>
          )}
        />

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

        <View style={styles.row}>
          <Controller
            control={control}
            name="cpf"
            render={({ field: { onChange, value } }) => (
              <View style={[styles.fieldGroup, styles.flex1]}>
                <Text style={styles.label}>CPF</Text>
                <TextInput
                  style={[styles.input, errors.cpf && styles.inputError]}
                  placeholder="Somente números"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={11}
                  onChangeText={onChange}
                  value={value}
                  editable={!isSubmitting}
                />
                {errors.cpf && <Text style={styles.errorText}>{errors.cpf.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="telefone"
            render={({ field: { onChange, value } }) => (
              <View style={[styles.fieldGroup, styles.flex1]}>
                <Text style={styles.label}>Telefone</Text>
                <TextInput
                  style={[styles.input, errors.telefone && styles.inputError]}
                  placeholder="(11) 99999-9999"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={11}
                  onChangeText={onChange}
                  value={value}
                  editable={!isSubmitting}
                />
                {errors.telefone && <Text style={styles.errorText}>{errors.telefone.message}</Text>}
              </View>
            )}
          />
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Segurança</Text>

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
                autoComplete="new-password"
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
            : <Text style={styles.buttonText}>Criar conta</Text>
          }
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.replace("/(auth)/login")} disabled={isSubmitting}>
        <Text style={styles.link}>Já tem conta? <Text style={styles.linkBold}>Faça login</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#EFF3FF" },
  container: { flexGrow: 1, padding: 24, paddingTop: 48, gap: 20, paddingBottom: 40 },
  header: { alignItems: "center", gap: 8 },
  logoMark: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: "#1B4FD8", alignItems: "center", justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#1B4FD8", shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  logoMarkText: { fontSize: 28, fontWeight: "800", color: "#fff" },
  logo: { fontSize: 28, fontWeight: "800", color: "#1B4FD8", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#64748B", fontWeight: "500" },
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, gap: 14,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#1B4FD8", textTransform: "uppercase", letterSpacing: 0.8 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 2 },
  fieldGroup: { gap: 5 },
  flex1: { flex: 1 },
  row: { flexDirection: "row", gap: 12 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginLeft: 2 },
  input: {
    borderWidth: 1.5, borderColor: "#CBD5E1", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: "#0F172A", backgroundColor: "#F8FAFC",
  },
  inputError: { borderColor: "#EF4444", backgroundColor: "#FFF5F5" },
  errorText: { color: "#EF4444", fontSize: 11, fontWeight: "500", marginLeft: 2 },
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
