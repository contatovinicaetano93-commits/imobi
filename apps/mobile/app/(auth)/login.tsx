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
import * as SecureStore from "expo-secure-store";
import { LoginSchema, type LoginInput } from "@imbobi/schemas";
import { apiClient } from "@imbobi/core";
import { Ionicons } from "@expo/vector-icons";

const C = {
  blue:    "#1B4FD8",
  navy:    "#0C1A3D",
  mint:    "#22C55E",
  ink:     "#0F172A",
  gray:    "#64748B",
  grayL:   "#94A3B8",
  border:  "#E2E8F0",
  surface: "#F8FAFC",
  white:   "#FFFFFF",
  red:     "#EF4444",
};

export default function LoginScreen() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await apiClient.post<{ accessToken: string; refreshToken: string }>(
        "/auth/login", data
      );
      await SecureStore.setItemAsync("accessToken",  res.accessToken);
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
      router.replace("/(tabs)/obras");
    } catch (e: any) {
      Alert.alert("Acesso negado", e.message ?? "E-mail ou senha inválidos.");
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ── TOPO ── */}
      <View style={styles.hero}>
        <ImobiLogo />
        <Text style={styles.heroTagline}>Crédito imobiliário estruturado</Text>
      </View>

      {/* ── FORMULÁRIO ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.formSheet}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.formTitle}>Acesse sua conta</Text>

          {/* E-mail */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>E-MAIL</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputErr]}
                  placeholder="seu@email.com.br"
                  placeholderTextColor={C.grayL}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onChangeText={onChange}
                  value={value}
                  editable={!isSubmitting}
                />
                {errors.email && (
                  <Text style={styles.errText}>{errors.email.message}</Text>
                )}
              </View>
            )}
          />

          {/* Senha */}
          <Controller
            control={control}
            name="senha"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>SENHA</Text>
                <View style={styles.passWrap}>
                  <TextInput
                    style={[styles.input, styles.passInput, errors.senha && styles.inputErr]}
                    placeholder="••••••••"
                    placeholderTextColor={C.grayL}
                    secureTextEntry={!showPass}
                    autoComplete="password"
                    onChangeText={onChange}
                    value={value}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPass((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPass ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={C.grayL}
                    />
                  </TouchableOpacity>
                </View>
                {errors.senha && (
                  <Text style={styles.errText}>{errors.senha.message}</Text>
                )}
              </View>
            )}
          />

          {/* Entrar */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting
              ? <ActivityIndicator color={C.white} />
              : <Text style={styles.submitBtnText}>Entrar na plataforma</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Criar conta */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push("/(auth)/cadastro")}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Criar conta gratuita →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ImobiLogo() {
  return (
    <View style={logoStyles.root}>
      {/* Grid icon: 3×3, cells 1,3,5,7,9 filled (checkerboard) */}
      <View style={logoStyles.grid}>
        {[1,2,3,4,5,6,7,8,9].map((n) => (
          <View
            key={n}
            style={[
              logoStyles.cell,
              [1,3,5,7,9].includes(n) && logoStyles.cellFilled,
            ]}
          />
        ))}
      </View>
      <Text style={logoStyles.text}>IMOBI</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  root:       { alignItems: "center", gap: 12 },
  grid:       { flexDirection: "row", flexWrap: "wrap", width: 42, height: 42, gap: 3 },
  cell:       { width: 11, height: 11, borderRadius: 2, backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(74,222,128,0.35)" },
  cellFilled: { backgroundColor: "#4ADE80", borderColor: "#4ADE80" },
  text:       { fontSize: 38, fontWeight: "800", color: "#FFFFFF", letterSpacing: 6 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navy },

  // Hero top section
  hero: {
    paddingTop:     Platform.OS === "ios" ? 72 : 52,
    paddingBottom:  40,
    alignItems:     "center",
    gap:            20,
  },
  heroTagline: {
    fontSize:    13,
    color:       "rgba(255,255,255,0.50)",
    fontWeight:  "500",
    letterSpacing: 0.5,
  },

  // White form sheet
  formSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    padding:    28,
    paddingBottom: 48,
    gap:        20,
    flexGrow:   1,
  },
  formTitle: {
    fontSize:   22,
    fontWeight: "700",
    color:      C.ink,
    marginBottom: 4,
  },

  // Fields
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize:     10,
    fontWeight:   "700",
    letterSpacing: 0.8,
    color:        C.gray,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth:     1,
    borderColor:     C.border,
    borderRadius:    12,
    paddingHorizontal: 14,
    paddingVertical:   13,
    fontSize:        15,
    color:           C.ink,
  },
  inputErr: { borderColor: C.red },
  errText:  { fontSize: 12, color: C.red, marginTop: 2 },

  passWrap:  { position: "relative" },
  passInput: { paddingRight: 46 },
  eyeBtn:    { position: "absolute", right: 14, top: 14 },

  // Buttons
  submitBtn: {
    backgroundColor: C.blue,
    borderRadius:    14,
    paddingVertical: 16,
    alignItems:      "center",
    marginTop:       4,
    shadowColor:     C.blue,
    shadowOpacity:   0.28,
    shadowRadius:    12,
    elevation:       4,
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitBtnText: { color: C.white, fontSize: 16, fontWeight: "700" },

  divider:     { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.grayL, fontWeight: "500" },

  secondaryBtn: {
    borderWidth:   1.5,
    borderColor:   C.border,
    borderRadius:  14,
    paddingVertical: 14,
    alignItems:    "center",
  },
  secondaryBtnText: { color: C.blue, fontSize: 15, fontWeight: "700" },
});
