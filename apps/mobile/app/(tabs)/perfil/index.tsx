import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import ScreenHeader from "../../../components/ScreenHeader";
import KeyboardAwareScroll from "../../../components/KeyboardAwareScroll";
import { usuariosApi, authApi, type UsuarioPerfil } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf || "—";
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatTelefone(tel: string): string {
  const d = tel.replace(/\D/g, "");
  if (d.length < 10) return tel || "—";
  return d.length === 11
    ? d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    : d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}

/** Perfil da empresa — mesmos campos do cadastro inicial (CadastroUsuarioSchema) */
export default function PerfilScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const carregarDados = useCallback(async () => {
    setErro(null);
    setLoading(true);
    try {
      const perfil = await usuariosApi.obterPerfil();
      setUsuario(perfil);
      setNome(perfil.nome);
      setTelefone(perfil.telefone.replace(/\D/g, ""));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar perfil";
      setErro(msg.includes("Network request failed")
        ? "Sem conexão com o servidor. Verifique sua internet."
        : msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const salvar = async () => {
    const tel = telefone.replace(/\D/g, "");
    if (nome.trim().length < 3) {
      Alert.alert("Nome inválido", "Informe o nome completo (mín. 3 caracteres).");
      return;
    }
    if (tel.length < 10 || tel.length > 11) {
      Alert.alert("Telefone inválido", "Informe DDD + número (10 ou 11 dígitos).");
      return;
    }
    setSalvando(true);
    try {
      const atualizado = await usuariosApi.atualizarPerfil({ nome: nome.trim(), telefone: tel });
      setUsuario(atualizado);
      setTelefone(atualizado.telefone.replace(/\D/g, ""));
      setEditando(false);
      Alert.alert("Salvo", "Dados atualizados com sucesso.");
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair", style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          try {
            const refreshToken = await SecureStore.getItemAsync("refreshToken");
            if (refreshToken) await authApi.logout(refreshToken);
          } catch { /* ignore */ } finally {
            await signOut();
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1B4FD8" /></View>;
  }

  const kycOk = usuario?.kycStatus === "APROVADO";

  return (
    <View style={styles.root}>
      <ScreenHeader title="Perfil da empresa" subtitle="Dados do cadastro inicial" />

      <KeyboardAwareScroll contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={carregarDados} tintColor="#1B4FD8" />}>
        {erro && !usuario && (
          <View style={styles.erroCard}>
            <Ionicons name="cloud-offline-outline" size={32} color="#991B1B" />
            <Text style={styles.erroText}>{erro}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={carregarDados}>
              <Text style={styles.retryBtnText}>Tentar novamente</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
              <Text style={styles.logoutBtnText}>{loggingOut ? "Saindo..." : "Sair e trocar de conta"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {usuario && (
          <>
            <View style={styles.hero}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{usuario.nome.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.heroNome}>{usuario.nome}</Text>
              <Text style={styles.heroEmail}>{usuario.email}</Text>
              <View style={[styles.kycChip, kycOk ? styles.kycOk : styles.kycPending]}>
                <Ionicons name={kycOk ? "shield-checkmark" : "shield-outline"} size={14} color={kycOk ? "#166534" : "#92400E"} />
                <Text style={[styles.kycChipText, { color: kycOk ? "#166534" : "#92400E" }]}>
                  {kycOk ? "KYC aprovado" : "KYC pendente — envie documentos"}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Dados do cadastro</Text>
                <TouchableOpacity onPress={() => editando ? salvar() : setEditando(true)} disabled={salvando}>
                  <Text style={styles.editLink}>{salvando ? "Salvando..." : editando ? "Salvar" : "Editar"}</Text>
                </TouchableOpacity>
              </View>

              <Field label="NOME COMPLETO" value={editando ? undefined : usuario.nome}>
                {editando && <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome do responsável" />}
              </Field>
              <Field label="CPF" value={formatCpf(usuario.cpf)} locked hint="Não editável após cadastro" />
              <Field label="E-MAIL" value={usuario.email} locked hint="Não editável após cadastro" />
              <Field label="WHATSAPP" value={editando ? undefined : formatTelefone(usuario.telefone)}>
                {editando && <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" placeholder="11999999999" maxLength={11} />}
              </Field>
              <Field label="TIPO DE CONTA" value={usuario.tipo} locked />
            </View>

            <TouchableOpacity style={styles.linkCard} onPress={() => router.push("/documentos")}>
              <Ionicons name="document-text-outline" size={24} color="#1B4FD8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Documentos KYC</Text>
                <Text style={styles.linkSub}>Próximo passo do fluxo — liberação de crédito</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkCard} onPress={() => router.push("/obras/cadastrar")}>
              <Ionicons name="business-outline" size={24} color="#1B4FD8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Cadastrar obra</Text>
                <Text style={styles.linkSub}>Registre sua obra para validação por etapas</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
              <Text style={styles.logoutBtnText}>{loggingOut ? "Saindo..." : "Sair da conta"}</Text>
            </TouchableOpacity>
          </>
        )}
      </KeyboardAwareScroll>
    </View>
  );
}

function Field({ label, value, locked, hint, children }: {
  label: string; value?: string; locked?: boolean; hint?: string; children?: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children ?? <Text style={[styles.fieldValue, locked && styles.fieldLocked]}>{value}</Text>}
      {hint && locked ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  hero: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#E2E8F0" },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#1B4FD8", justifyContent: "center", alignItems: "center", marginBottom: 4 },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#fff" },
  heroNome: { fontSize: 18, fontWeight: "700", color: "#0F172A", textAlign: "center" },
  heroEmail: { fontSize: 13, color: "#64748B" },
  kycChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  kycOk: { backgroundColor: "#DCFCE7" },
  kycPending: { backgroundColor: "#FEF9C3" },
  kycChipText: { fontSize: 12, fontWeight: "700" },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  editLink: { fontSize: 14, fontWeight: "700", color: "#1B4FD8" },
  field: { gap: 4, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  fieldLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, color: "#64748B" },
  fieldValue: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  fieldLocked: { color: "#475569" },
  fieldHint: { fontSize: 11, color: "#94A3B8" },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12, fontSize: 15, color: "#0F172A" },
  linkCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#EEF3FF", borderRadius: 14, padding: 16 },
  linkTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  linkSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  logoutBtn: { backgroundColor: "#EF4444", borderRadius: 14, padding: 16, alignItems: "center" },
  logoutBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  erroCard: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", gap: 12 },
  erroText: { fontSize: 14, color: "#991B1B", textAlign: "center" },
  retryBtn: { backgroundColor: "#1B4FD8", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  retryBtnText: { color: "#fff", fontWeight: "700" },
});
