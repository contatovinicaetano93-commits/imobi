import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { CadastroUsuarioSchema, type CadastroUsuarioInput } from "@imbobi/schemas";
import { apiClient } from "@imbobi/core";

const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

function formatCPF(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return cleaned.slice(0, 3) + "." + cleaned.slice(3);
  if (cleaned.length <= 9) return cleaned.slice(0, 3) + "." + cleaned.slice(3, 6) + "." + cleaned.slice(6);
  return cleaned.slice(0, 3) + "." + cleaned.slice(3, 6) + "." + cleaned.slice(6, 9) + "-" + cleaned.slice(9, 11);
}

function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 5) return cleaned;
  if (cleaned.length <= 10) return "(" + cleaned.slice(0, 2) + ") " + cleaned.slice(2);
  return "(" + cleaned.slice(0, 2) + ") " + cleaned.slice(2, 7) + "-" + cleaned.slice(7, 11);
}

export default function RegisterScreen() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<CadastroUsuarioInput>({
    resolver: zodResolver(CadastroUsuarioSchema),
    defaultValues: {
      nome: "",
      cpf: "",
      email: "",
      telefone: "",
      senha: "",
      tipo: "TOMADOR",
    },
  });

  const onSubmit = async (data: CadastroUsuarioInput) => {
    try {
      const payload = {
        ...data,
        cpf: data.cpf.replace(/\D/g, ""),
        telefone: data.telefone.replace(/\D/g, ""),
      };

      const res = await apiClient.post<{ accessToken: string; refreshToken: string }>(
        "/auth/register",
        payload
      );

      await SecureStore.setItemAsync("accessToken", res.accessToken);
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
      router.replace("/(tabs)/obras");
    } catch (err: any) {
      Alert.alert("Erro no cadastro", err.message ?? "Tente novamente mais tarde.");
    }
  };

  const getErrorMessage = (field: keyof CadastroUsuarioInput): string => {
    const error = errors[field];
    if (!error) return "";
    return error.message ?? "Campo inválido";
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.logo}>imbobi</Text>
      <Text style={styles.subtitle}>Crie sua conta</Text>

      <Controller
        control={control}
        name="nome"
        render={({ field: { onChange, value } }) => (
          <View>
            <TextInput
              style={[styles.input, errors.nome && styles.inputError]}
              placeholder="Nome completo"
              autoCapitalize="words"
              onChangeText={onChange}
              value={value}
              editable={!isSubmitting}
            />
            {errors.nome && <Text style={styles.errorText}>{getErrorMessage("nome")}</Text>}
          </View>
        )}
      />

      <Controller
        control={control}
        name="cpf"
        render={({ field: { onChange, value } }) => (
          <View>
            <TextInput
              style={[styles.input, errors.cpf && styles.inputError]}
              placeholder="CPF (000.000.000-00)"
              keyboardType="number-pad"
              maxLength={14}
              onChangeText={(val) => onChange(formatCPF(val))}
              value={value}
              editable={!isSubmitting}
            />
            {errors.cpf && <Text style={styles.errorText}>{getErrorMessage("cpf")}</Text>}
          </View>
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <View>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="E-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={onChange}
              value={value}
              editable={!isSubmitting}
            />
            {errors.email && <Text style={styles.errorText}>{getErrorMessage("email")}</Text>}
          </View>
        )}
      />

      <Controller
        control={control}
        name="telefone"
        render={({ field: { onChange, value } }) => (
          <View>
            <TextInput
              style={[styles.input, errors.telefone && styles.inputError]}
              placeholder="Telefone ((11) 9999-9999)"
              keyboardType="phone-pad"
              maxLength={15}
              onChangeText={(val) => onChange(formatPhone(val))}
              value={value}
              editable={!isSubmitting}
            />
            {errors.telefone && <Text style={styles.errorText}>{getErrorMessage("telefone")}</Text>}
          </View>
        )}
      />

      <Controller
        control={control}
        name="senha"
        render={({ field: { onChange, value } }) => (
          <View>
            <TextInput
              style={[styles.input, errors.senha && styles.inputError]}
              placeholder="Senha (mín. 8 caracteres)"
              secureTextEntry
              onChangeText={onChange}
              value={value}
              editable={!isSubmitting}
            />
            {errors.senha && <Text style={styles.errorText}>{getErrorMessage("senha")}</Text>}
            <Text style={styles.hint}>Mínimo 8 caracteres, com maiúscula e número</Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonLoading]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>{isSubmitting ? "Cadastrando..." : "Cadastrar"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
        <Text style={styles.link}>Já tem conta? Faça login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 24, paddingTop: 40, gap: 14, paddingBottom: 40 },
  logo: { fontSize: 36, fontWeight: "800", color: "#16a34a", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#6b7280", textAlign: "center", marginBottom: 12 },
  input: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, padding: 14, fontSize: 15, color: "#111827" },
  inputError: { borderColor: "#ef4444" },
  errorText: { fontSize: 12, color: "#dc2626", marginTop: 4 },
  hint: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  button: { backgroundColor: "#16a34a", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  buttonLoading: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { textAlign: "center", color: "#16a34a", fontSize: 14, fontWeight: "500", marginTop: 8 },
});
