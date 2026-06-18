import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
  StatusBar,
} from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { LoginSchema, type LoginInput } from "@imbobi/schemas";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { authApi, salvarTokens } from "../../lib/api";
import { getHomeRoute } from "../../lib/roles";

const C = {
  blue: "#1B4FD8", navy: "#0C1A3D", ink: "#0F172A",
  gray: "#64748B", grayL: "#94A3B8", border: "#E2E8F0",
  surface: "#F8FAFC", white: "#FFFFFF", red: "#EF4444", mint: "#4ADE80",
};

export default function LoginScreen() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await authApi.login(data.email, data.senha);
      await salvarTokens(res);
      const tipo = res.usuario?.tipo ?? "TOMADOR";
      await SecureStore.setItemAsync("userTipo", tipo);
      router.replace(getHomeRoute(tipo) as never);
    } catch (e: unknown) {
      Alert.alert("Acesso negado", e instanceof Error ? e.message : "E-mail ou senha inválidos.");
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={styles.hero}>
        <ImobiLogo />
        <Text style={styles.heroTitle}>Entrar</Text>
        <Text style={styles.heroSub}>Acesse com e-mail e senha da plataforma</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}>
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
          <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
            <Field label="E-MAIL" error={errors.email?.message}>
              <TextInput style={[styles.input, errors.email && styles.inputErr]} placeholder="seu@email.com.br"
                placeholderTextColor={C.grayL} keyboardType="email-address" autoCapitalize="none"
                autoComplete="email" onChangeText={onChange} value={value} editable={!isSubmitting} />
            </Field>
          )} />

          <Controller control={control} name="senha" render={({ field: { onChange, value } }) => (
            <Field label="SENHA" error={errors.senha?.message}>
              <View style={styles.passWrap}>
                <TextInput style={[styles.input, styles.passInput, errors.senha && styles.inputErr]}
                  placeholder="Sua senha" placeholderTextColor={C.grayL} secureTextEntry={!showPass}
                  autoComplete="password" onChangeText={onChange} value={value} editable={!isSubmitting} />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass((v) => !v)}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={C.grayL} />
                </TouchableOpacity>
              </View>
            </Field>
          )} />

          <TouchableOpacity onPress={() => router.push("/esqueceu-senha")} style={styles.forgot}>
            <Text style={styles.forgotText}>Esqueci minha senha</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryBtn, isSubmitting && styles.disabled]}
            onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting
              ? <ActivityIndicator color={C.white} />
              : <Text style={styles.primaryBtnText}>Entrar</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ainda não tem conta?</Text>
            <TouchableOpacity onPress={() => router.push("/cadastro")} disabled={isSubmitting}>
              <Text style={styles.footerLink}>Criar conta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

function ImobiLogo() {
  return (
    <View style={logo.root}>
      <View style={logo.grid}>
        {[1,2,3,4,5,6,7,8,9].map((n) => (
          <View key={n} style={[logo.cell, [1,3,5,7,9].includes(n) && logo.filled]} />
        ))}
      </View>
      <Text style={logo.text}>IMOBI</Text>
    </View>
  );
}

const logo = StyleSheet.create({
  root: { alignItems: "center", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", width: 36, height: 36, gap: 3 },
  cell: { width: 9, height: 9, borderRadius: 2, borderWidth: 1, borderColor: "rgba(74,222,128,0.4)" },
  filled: { backgroundColor: "#4ADE80", borderColor: "#4ADE80" },
  text: { fontSize: 28, fontWeight: "800", color: "#FFF", letterSpacing: 5 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navy },
  hero: { paddingTop: Platform.OS === "ios" ? 64 : 44, paddingBottom: 28, alignItems: "center", gap: 8 },
  heroTitle: { fontSize: 26, fontWeight: "800", color: C.white, marginTop: 8 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.55)" },
  sheet: {
    flexGrow: 1, backgroundColor: C.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 48, gap: 14,
  },
  field: { gap: 6 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, color: C.gray },
  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: C.ink,
  },
  inputErr: { borderColor: C.red },
  err: { fontSize: 12, color: C.red },
  passWrap: { position: "relative" },
  passInput: { paddingRight: 46 },
  eyeBtn: { position: "absolute", right: 14, top: 14 },
  forgot: { alignSelf: "flex-end" },
  forgotText: { color: C.blue, fontSize: 13, fontWeight: "600" },
  primaryBtn: { backgroundColor: C.blue, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  disabled: { opacity: 0.55 },
  primaryBtnText: { color: C.white, fontSize: 16, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  footerText: { fontSize: 14, color: C.gray },
  footerLink: { fontSize: 14, color: C.blue, fontWeight: "700" },
});
