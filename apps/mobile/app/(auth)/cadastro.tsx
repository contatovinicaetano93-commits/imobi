import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator,
  StatusBar, Platform, KeyboardAvoidingView,
} from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { CadastroUsuarioSchema, type CadastroUsuarioInput } from "@imbobi/schemas";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { authApi, salvarTokens } from "../../lib/api";

const C = {
  mint: "#22C55E", mintDark: "#16A34A", navy: "#0C1A3D", ink: "#0F172A",
  gray: "#64748B", grayL: "#94A3B8", border: "#E2E8F0",
  surface: "#F0FDF4", white: "#FFFFFF", red: "#EF4444",
};

type FieldDef = {
  name: keyof Pick<CadastroUsuarioInput, "nome" | "cpf" | "email" | "telefone" | "senha">;
  label: string;
  placeholder: string;
  keyboard?: "default" | "email-address" | "numeric" | "phone-pad";
  secure?: boolean;
  capitalize?: "none" | "words";
  maxLength?: number;
};

const FIELDS: FieldDef[] = [
  { name: "nome", label: "NOME COMPLETO", placeholder: "Responsável pela construtora", capitalize: "words" },
  { name: "cpf", label: "CPF", placeholder: "00000000000", keyboard: "numeric", maxLength: 11 },
  { name: "email", label: "E-MAIL", placeholder: "seu@email.com.br", keyboard: "email-address", capitalize: "none" },
  { name: "telefone", label: "WHATSAPP", placeholder: "11999999999", keyboard: "phone-pad", maxLength: 11 },
  { name: "senha", label: "SENHA", placeholder: "Mín. 8 caracteres", secure: true },
];

export default function CadastroScreen() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const { control, handleSubmit, setValue, watch, trigger, formState: { errors, isSubmitting } } =
    useForm<CadastroUsuarioInput>({
      resolver: zodResolver(CadastroUsuarioSchema),
      defaultValues: {
        tipo: "TOMADOR",
        consentidoTermos: false,
        consentidoPrivacy: false,
        consentidoKyc: false,
        consentidoMarketing: false,
      },
    });

  const termos = watch("consentidoTermos");
  const privacy = watch("consentidoPrivacy");
  const kyc = watch("consentidoKyc");
  const marketing = watch("consentidoMarketing");

  const avancar = async () => {
    const ok = await trigger(["nome", "cpf", "email", "telefone", "senha"]);
    if (ok) setStep(2);
  };

  const onSubmit = async (data: CadastroUsuarioInput) => {
    try {
      const res = await authApi.registrar({ ...data, tipo: "TOMADOR" });
      await salvarTokens(res);
      const tipo = res.usuario?.tipo ?? "TOMADOR";
      await SecureStore.setItemAsync("userTipo", tipo);
      Alert.alert(
        "Conta criada!",
        "Envie seus documentos para liberar crédito.",
        [{ text: "Continuar", onPress: () => router.replace("/documentos") }]
      );
    } catch (e: unknown) {
      Alert.alert("Erro no cadastro", e instanceof Error ? e.message : "Tente novamente.");
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.mintDark} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => step === 2 ? setStep(1) : router.replace("/login")}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Criar conta</Text>
          <Text style={styles.headerStep}>Passo {step} de 2 · Construtor</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.progress}>
        <View style={[styles.progressDot, step >= 1 && styles.progressActive]} />
        <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
        <View style={[styles.progressDot, step >= 2 && styles.progressActive]} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
          {step === 1 ? (
            <>
              <Text style={styles.title}>Dados da empresa</Text>
              <Text style={styles.sub}>Mesmos campos exibidos no perfil após o cadastro</Text>
              {FIELDS.map((f) => (
                <Controller key={f.name} control={control} name={f.name}
                  render={({ field: { onChange, value } }) => {
                    const isPass = f.name === "senha";
                    return (
                      <View style={styles.field}>
                        <Text style={styles.label}>{f.label}</Text>
                        <View style={isPass ? styles.passWrap : undefined}>
                          <TextInput style={[styles.input, isPass && styles.passInput, errors[f.name] && styles.inputErr]}
                            placeholder={f.placeholder} placeholderTextColor={C.grayL}
                            keyboardType={f.keyboard ?? "default"} autoCapitalize={f.capitalize ?? "none"}
                            secureTextEntry={isPass && !showPass} maxLength={f.maxLength}
                            onChangeText={onChange} value={value as string} editable={!isSubmitting} />
                          {isPass && (
                            <TouchableOpacity style={styles.eye} onPress={() => setShowPass((v) => !v)}>
                              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={C.grayL} />
                            </TouchableOpacity>
                          )}
                        </View>
                        {errors[f.name] && <Text style={styles.err}>{errors[f.name]?.message as string}</Text>}
                      </View>
                    );
                  }}
                />
              ))}
              <TouchableOpacity style={styles.primaryBtn} onPress={avancar}>
                <Text style={styles.primaryBtnText}>Continuar →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Consentimentos LGPD</Text>
              <Text style={styles.sub}>Obrigatório para uso da plataforma e verificação KYC</Text>
              <View style={styles.consentBox}>
                <Consent checked={!!termos} onToggle={() => setValue("consentidoTermos", !termos, { shouldValidate: true })} label="Aceito os Termos de Uso" req />
                <Consent checked={!!privacy} onToggle={() => setValue("consentidoPrivacy", !privacy, { shouldValidate: true })} label="Aceito a Política de Privacidade" req />
                <Consent checked={!!kyc} onToggle={() => setValue("consentidoKyc", !kyc, { shouldValidate: true })} label="Autorizo verificação de identidade (KYC)" req />
                <Consent checked={!!marketing} onToggle={() => setValue("consentidoMarketing", !marketing)} label="Receber novidades (opcional)" />
              </View>
              {(errors.consentidoTermos || errors.consentidoPrivacy || errors.consentidoKyc) && (
                <Text style={styles.err}>Aceite todos os itens obrigatórios (*)</Text>
              )}
              <TouchableOpacity style={[styles.primaryBtn, isSubmitting && styles.disabled]}
                onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color={C.white} /> : <Text style={styles.primaryBtnText}>Criar minha conta</Text>}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.loginLink} onPress={() => router.replace("/login")}>
            <Text style={styles.loginLinkText}>Já tenho conta · Entrar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Consent({ checked, onToggle, label, req }: { checked: boolean; onToggle: () => void; label: string; req?: boolean }) {
  return (
    <TouchableOpacity style={consent.row} onPress={onToggle}>
      <Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={checked ? C.mintDark : C.grayL} />
      <Text style={consent.label}>{label}{req ? " *" : ""}</Text>
    </TouchableOpacity>
  );
}

const consent = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  label: { flex: 1, fontSize: 13, color: "#334155", lineHeight: 18 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.mintDark },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 36, paddingBottom: 12, paddingHorizontal: 16,
  },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.white },
  headerStep: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  progress: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingBottom: 8, gap: 0 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.3)" },
  progressActive: { backgroundColor: C.white },
  progressLine: { width: 48, height: 2, backgroundColor: "rgba(255,255,255,0.25)" },
  progressLineActive: { backgroundColor: C.white },
  scroll: { flex: 1 },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 48, gap: 14, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: "700", color: C.ink },
  sub: { fontSize: 13, color: C.gray, marginTop: -6 },
  field: { gap: 6 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, color: C.gray },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.ink },
  inputErr: { borderColor: C.red },
  err: { fontSize: 12, color: C.red },
  passWrap: { position: "relative" },
  passInput: { paddingRight: 46 },
  eye: { position: "absolute", right: 14, top: 14 },
  consentBox: { gap: 12, padding: 14, backgroundColor: C.surface, borderRadius: 12 },
  primaryBtn: { backgroundColor: C.mintDark, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  disabled: { opacity: 0.55 },
  primaryBtnText: { color: C.white, fontSize: 16, fontWeight: "700" },
  loginLink: { alignItems: "center", paddingVertical: 8 },
  loginLinkText: { color: C.mintDark, fontSize: 14, fontWeight: "600" },
});
