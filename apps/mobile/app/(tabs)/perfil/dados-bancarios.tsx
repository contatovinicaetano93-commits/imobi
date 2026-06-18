import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { dadosBancariosApi, type DadosBancarios } from "../../../lib/api";

type TipoConta = "CORRENTE" | "POUPANCA";
type TipoChavePix = "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA";

const TIPOS_CONTA: TipoConta[] = ["CORRENTE", "POUPANCA"];
const TIPOS_PIX: TipoChavePix[] = ["CPF", "CNPJ", "EMAIL", "TELEFONE", "ALEATORIA"];

export default function DadosBancariosScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [tipoConta, setTipoConta] = useState<TipoConta>("CORRENTE");
  const [usaPix, setUsaPix] = useState(false);
  const [tipoChavePix, setTipoChavePix] = useState<TipoChavePix>("CPF");
  const [chavePix, setChavePix] = useState("");
  const [nomeTitular, setNomeTitular] = useState("");
  const [cpfCnpjTitular, setCpfCnpjTitular] = useState("");

  useEffect(() => {
    dadosBancariosApi.buscar().then((data) => {
      if (data) {
        setBanco(data.banco);
        setAgencia(data.agencia ?? "");
        setConta(data.conta ?? "");
        setTipoConta((data.tipoConta as TipoConta) ?? "CORRENTE");
        setNomeTitular(data.nomeTitular);
        setCpfCnpjTitular(data.cpfCnpjTitular);
        if (data.chavePix) {
          setUsaPix(true);
          setTipoChavePix((data.tipoChavePix as TipoChavePix) ?? "CPF");
          setChavePix(data.chavePix);
        }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSalvar = async () => {
    if (!banco.trim()) { Alert.alert("Campo obrigatório", "Informe o nome do banco."); return; }
    if (!nomeTitular.trim()) { Alert.alert("Campo obrigatório", "Informe o nome do titular."); return; }
    if (!cpfCnpjTitular.trim()) { Alert.alert("Campo obrigatório", "Informe o CPF/CNPJ do titular."); return; }
    if (!usaPix && (!agencia.trim() || !conta.trim())) {
      Alert.alert("Dados incompletos", "Informe agência e conta, ou uma chave Pix.");
      return;
    }
    if (usaPix && !chavePix.trim()) {
      Alert.alert("Campo obrigatório", "Informe a chave Pix.");
      return;
    }

    setSaving(true);
    try {
      await dadosBancariosApi.salvar({
        banco: banco.trim(),
        agencia: usaPix ? undefined : agencia.trim() || undefined,
        conta: usaPix ? undefined : conta.trim() || undefined,
        tipoConta: usaPix ? undefined : tipoConta,
        tipoChavePix: usaPix ? tipoChavePix : undefined,
        chavePix: usaPix ? chavePix.trim() : undefined,
        nomeTitular: nomeTitular.trim(),
        cpfCnpjTitular: cpfCnpjTitular.trim(),
      });
      Alert.alert("Salvo", "Dados bancários atualizados com sucesso.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível salvar os dados.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Dados Bancários</Text>
      <Text style={styles.subtitulo}>
        Conta para recebimento das parcelas liberadas de crédito.
      </Text>

      <Field label="Banco" value={banco} onChangeText={setBanco} placeholder="Ex: Nubank, Itaú, Bradesco" />
      <Field label="Nome do titular" value={nomeTitular} onChangeText={setNomeTitular} placeholder="Nome completo" />
      <Field label="CPF / CNPJ do titular" value={cpfCnpjTitular} onChangeText={setCpfCnpjTitular} placeholder="000.000.000-00" keyboardType="numeric" />

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggle, !usaPix && styles.toggleActive]}
          onPress={() => setUsaPix(false)}
        >
          <Text style={[styles.toggleText, !usaPix && styles.toggleTextActive]}>Agência / Conta</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggle, usaPix && styles.toggleActive]}
          onPress={() => setUsaPix(true)}
        >
          <Text style={[styles.toggleText, usaPix && styles.toggleTextActive]}>Chave Pix</Text>
        </TouchableOpacity>
      </View>

      {!usaPix ? (
        <>
          <Field label="Agência" value={agencia} onChangeText={setAgencia} placeholder="0000" keyboardType="numeric" />
          <Field label="Conta" value={conta} onChangeText={setConta} placeholder="00000-0" keyboardType="numeric" />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Tipo de conta</Text>
            <View style={styles.chips}>
              {TIPOS_CONTA.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, tipoConta === t && styles.chipActive]}
                  onPress={() => setTipoConta(t)}
                >
                  <Text style={[styles.chipText, tipoConta === t && styles.chipTextActive]}>
                    {t === "CORRENTE" ? "Corrente" : "Poupança"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Tipo de chave Pix</Text>
            <View style={styles.chips}>
              {TIPOS_PIX.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, tipoChavePix === t && styles.chipActive]}
                  onPress={() => setTipoChavePix(t)}
                >
                  <Text style={[styles.chipText, tipoChavePix === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Field
            label="Chave Pix"
            value={chavePix}
            onChangeText={setChavePix}
            placeholder={tipoChavePix === "EMAIL" ? "email@exemplo.com" : tipoChavePix === "TELEFONE" ? "+5511999999999" : "Cole sua chave aqui"}
            keyboardType={tipoChavePix === "EMAIL" ? "email-address" : "default"}
          />
        </>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSalvar}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Salvar dados bancários</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, paddingBottom: 40, gap: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { marginBottom: 4 },
  backText: { color: "#16a34a", fontSize: 15, fontWeight: "600" },
  titulo: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subtitulo: { fontSize: 14, color: "#6b7280", lineHeight: 20, marginTop: -8 },
  toggleRow: { flexDirection: "row", backgroundColor: "#e5e7eb", borderRadius: 12, padding: 4, gap: 4 },
  toggle: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  toggleActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  toggleTextActive: { color: "#111827", fontWeight: "700" },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, fontSize: 15, color: "#111827" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  chipActive: { borderColor: "#16a34a", backgroundColor: "#dcfce7" },
  chipText: { fontSize: 13, fontWeight: "500", color: "#6b7280" },
  chipTextActive: { color: "#15803d", fontWeight: "700" },
  saveBtn: { backgroundColor: "#16a34a", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
