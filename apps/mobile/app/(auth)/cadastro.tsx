import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator,
  StatusBar, Platform,
} from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { CadastroUsuarioSchema, type CadastroUsuarioInput } from "@imbobi/schemas";
import { apiClient } from "../../lib/api";
import { reloadAuth } from "../_layout";
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

type FieldDef = {
  name: keyof CadastroUsuarioInput;
  label: string;
  placeholder: string;
  keyboard?: "default" | "email-address" | "numeric" | "phone-pad";
  secure?: boolean;
  capitalize?: "none" | "words" | "sentences";
  maxLength?: number;
  autoComplete?: "off" | "email" | "name" | "password" | "tel";
};

const FIELDS: FieldDef[] = [
  { name: "nome",     label: "NOME COMPLETO", placeholder: "Seu nome",             capitalize: "words",  autoComplete: "name"     },
  { name: "cpf",      label: "CPF",           placeholder: "00000000000",           keyboard: "numeric",  maxLength: 11             },
  { name: "email",    label: "E-MAIL",        placeholder: "seu@email.com.br",      keyboard: "email-address", capitalize: "none", autoComplete: "email"    },
  { name: "telefone", label: "WHATSAPP",      placeholder: "11999999999",           keyboard: "phone-pad", maxLength: 11            },
  { name: "senha",    label: "SENHA",         placeholder: "Mín. 8 caracteres",     secure: true,         autoComplete: "password" },
];

export default function CadastroScreen() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<CadastroUsuarioInput>({ resolver: zodResolver(CadastroUsuarioSchema) });

  const onSubmit = async (data: CadastroUsuarioInput) => {
    try {
      const res = await apiClient.post<{ accessToken: string; refreshToken: string }>(
        "/auth/registrar",
        { ...data, tipo: "TOMADOR", consentidoTermos: true, consentidoPrivacy: true, consentidoKyc: true, consentidoMarketing: false }
      );
      await SecureStore.setItemAsync("accessToken",  res.accessToken);
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
      await reloadAuth(); // updates root layout state → routes to correct panel based on role
    } catch (e: any) {
      Alert.alert("Erro no cadastro", e.message ?? "Tente novamente.");
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ── HEADER AZUL ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/(auth)/login")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.topBarTitle}>IMOBI</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* ── FORM ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.formSheet}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formHead}>
          <Text style={styles.formTitle}>Criar conta</Text>
          <Text style={styles.formSub}>
            Preencha os dados para acessar a plataforma
          </Text>
        </View>

        {FIELDS.map((f) => (
          <Controller
            key={f.name}
            control={control}
            name={f.name}
            render={({ field: { onChange, value } }) => {
              const isPass    = f.name === "senha";
              const hasError  = !!errors[f.name];
              return (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <View style={isPass ? styles.passWrap : undefined}>
                    <TextInput
                      style={[
                        styles.input,
                        isPass && styles.passInput,
                        hasError && styles.inputErr,
                      ]}
                      placeholder={f.placeholder}
                      placeholderTextColor={C.grayL}
                      keyboardType={f.keyboard ?? "default"}
                      autoCapitalize={f.capitalize ?? "none"}
                      secureTextEntry={isPass && !showPass}
                      maxLength={f.maxLength}
                      autoComplete={f.autoComplete ?? "off"}
                      onChangeText={onChange}
                      value={value as string}
                      editable={!isSubmitting}
                    />
                    {isPass && (
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
                    )}
                  </View>
                  {hasError && (
                    <Text style={styles.errText}>
                      {errors[f.name]?.message as string}
                    </Text>
                  )}
                </View>
              );
            }}
          />
        ))}

        <Text style={styles.consentNote}>
          Ao criar sua conta você aceita os Termos de Uso, Política de Privacidade e autoriza a coleta de dados para KYC.
        </Text>

        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting
            ? <ActivityIndicator color={C.white} />
            : <Text style={styles.submitBtnText}>Criar minha conta</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.replace("/(auth)/login")}
          disabled={isSubmitting}
        >
          <Text style={styles.loginLinkText}>Já tenho conta · Entrar →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.navy },
  scroll: { flex: 1 },

  topBar: {
    flexDirection:  "row",
    alignItems:     "center",
    paddingTop:     Platform.OS === "ios" ? 56 : 36,
    paddingBottom:  16,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },
  topBarTitle: {
    fontSize: 18, fontWeight: "800", color: C.white, letterSpacing: 4,
  },

  formSheet: {
    backgroundColor:     C.white,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    padding:    28,
    paddingBottom: 48,
    gap:        16,
    flexGrow:   1,
  },
  formHead: { marginBottom: 4 },
  formTitle: { fontSize: 22, fontWeight: "700", color: C.ink },
  formSub:   { fontSize: 13, color: C.gray, marginTop: 4 },

  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize:     10,
    fontWeight:   "700",
    letterSpacing: 0.8,
    color:        C.gray,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth:   1,
    borderColor:   C.border,
    borderRadius:  12,
    paddingHorizontal: 14,
    paddingVertical:   13,
    fontSize:      15,
    color:         C.ink,
  },
  inputErr:  { borderColor: C.red },
  errText:   { fontSize: 12, color: C.red, marginTop: 2 },

  passWrap:  { position: "relative" },
  passInput: { paddingRight: 46 },
  eyeBtn:    { position: "absolute", right: 14, top: 14 },

  consentNote: {
    fontSize:   11,
    color:      C.grayL,
    lineHeight: 16,
    textAlign:  "center",
  },

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

  loginLink:     { alignItems: "center", paddingVertical: 4 },
  loginLinkText: { color: C.blue, fontSize: 14, fontWeight: "600" },
});
