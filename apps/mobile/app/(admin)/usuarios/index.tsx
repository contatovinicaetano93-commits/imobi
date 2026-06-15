import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminApi, type AdminUsuario } from "../../../lib/api";

const TIPO_LABEL: Record<string, string> = {
  TOMADOR: "Tomador",
  GESTOR_OBRA: "Eng. Obra",
  ADMIN: "Admin",
  PARCEIRO: "Parceiro",
};

const TIPO_COR: Record<string, string> = {
  TOMADOR: "#2563eb",
  GESTOR_OBRA: "#d97706",
  ADMIN: "#7c3aed",
  PARCEIRO: "#16a34a",
};

type NovoUsuario = { nome: string; email: string; senha: string; tipo: string };
const TIPOS = ["TOMADOR", "GESTOR_OBRA", "ADMIN", "PARCEIRO"];

export default function UsuariosScreen() {
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);

  const [modalCriar, setModalCriar] = useState(false);
  const [novo, setNovo] = useState<NovoUsuario>({ nome: "", email: "", senha: "", tipo: "TOMADOR" });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await adminApi.listarUsuarios();
      setUsuarios(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar usuários");
    }
  }, []);

  useEffect(() => {
    carregar().finally(() => setLoading(false));
  }, [carregar]);

  const onRefresh = async () => {
    setRefreshing(true);
    await carregar();
    setRefreshing(false);
  };

  const toggleBloquear = (u: AdminUsuario) => {
    const bloqueado = !!u.bloqueadoEm;
    Alert.alert(
      bloqueado ? "Desbloquear usuário" : "Bloquear usuário",
      `${bloqueado ? "Desbloquear" : "Bloquear"} ${u.nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: bloqueado ? "Desbloquear" : "Bloquear",
          style: bloqueado ? "default" : "destructive",
          onPress: async () => {
            try {
              const atualizado = await adminApi.atualizarUsuario(u.id, { bloqueado: !bloqueado });
              setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, bloqueadoEm: atualizado.bloqueadoEm } : x)));
            } catch (e: any) {
              Alert.alert("Erro", e.message ?? "Falha na operação.");
            }
          },
        },
      ]
    );
  };

  const criarUsuario = async () => {
    if (!novo.nome.trim() || !novo.email.trim() || !novo.senha.trim()) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }
    setSalvando(true);
    try {
      const criado = await adminApi.criarUsuario(novo);
      setUsuarios((prev) => [criado, ...prev]);
      setModalCriar(false);
      setNovo({ nome: "", email: "", senha: "", tipo: "TOMADOR" });
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Falha ao criar usuário.");
    } finally {
      setSalvando(false);
    }
  };

  const lista = filtro ? usuarios.filter((u) => u.tipo === filtro) : usuarios;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Usuários</Text>
        <TouchableOpacity style={styles.fab} onPress={() => setModalCriar(true)}>
          <Ionicons name="person-add-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* filtros por tipo */}
      <View style={styles.chips}>
        {[null, ...TIPOS].map((t) => (
          <TouchableOpacity
            key={t ?? "todos"}
            style={[styles.chip, filtro === t && styles.chipAtivo]}
            onPress={() => setFiltro(t)}
          >
            <Text style={[styles.chipText, filtro === t && styles.chipTextoAtivo]}>
              {t ? TIPO_LABEL[t] : "Todos"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={lista}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
          </View>
        }
        renderItem={({ item: u }) => {
          const bloqueado = !!u.bloqueadoEm;
          const cor = TIPO_COR[u.tipo] ?? "#6b7280";
          return (
            <View style={[styles.card, bloqueado && styles.cardBloqueado]}>
              <View style={styles.cardRow}>
                <View style={[styles.tipoTag, { backgroundColor: cor + "18" }]}>
                  <Text style={[styles.tipoText, { color: cor }]}>{TIPO_LABEL[u.tipo] ?? u.tipo}</Text>
                </View>
                {bloqueado && (
                  <View style={styles.bloqTag}>
                    <Text style={styles.bloqText}>Bloqueado</Text>
                  </View>
                )}
              </View>

              <Text style={styles.nome}>{u.nome}</Text>
              <Text style={styles.email}>{u.email}</Text>

              <View style={styles.meta}>
                <Text style={styles.metaText}>KYC: {u.kycStatus}</Text>
                <Text style={styles.metaText}>{u.totalObras} obra{u.totalObras !== 1 ? "s" : ""}</Text>
              </View>

              <TouchableOpacity
                style={[styles.btnBloquear, bloqueado && styles.btnDesbloquear]}
                onPress={() => toggleBloquear(u)}
              >
                <Ionicons name={bloqueado ? "lock-open-outline" : "lock-closed-outline"} size={14} color={bloqueado ? "#16a34a" : "#dc2626"} />
                <Text style={[styles.btnBloquearText, bloqueado && styles.btnDesbloquearText]}>
                  {bloqueado ? "Desbloquear" : "Bloquear"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Modal criar usuário */}
      <Modal visible={modalCriar} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Novo usuário</Text>

            <TextInput style={styles.input} placeholder="Nome completo" value={novo.nome}
              onChangeText={(v) => setNovo((p) => ({ ...p, nome: v }))} editable={!salvando} />
            <TextInput style={styles.input} placeholder="E-mail" keyboardType="email-address"
              autoCapitalize="none" value={novo.email}
              onChangeText={(v) => setNovo((p) => ({ ...p, email: v }))} editable={!salvando} />
            <TextInput style={styles.input} placeholder="Senha (mín. 8 caracteres)" secureTextEntry
              value={novo.senha} onChangeText={(v) => setNovo((p) => ({ ...p, senha: v }))} editable={!salvando} />

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.tipoOpcoes}>
              {TIPOS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tipoOpcao, novo.tipo === t && styles.tipoOpcaoAtiva]}
                  onPress={() => setNovo((p) => ({ ...p, tipo: t }))}
                >
                  <Text style={[styles.tipoOpcaoText, novo.tipo === t && styles.tipoOpcaoTextoAtivo]}>
                    {TIPO_LABEL[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalAcoes}>
              <TouchableOpacity style={styles.modalCancelar} onPress={() => { setModalCriar(false); setNovo({ nome: "", email: "", senha: "", tipo: "TOMADOR" }); }} disabled={salvando}>
                <Text style={styles.modalCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmar, salvando && { opacity: 0.5 }]} onPress={criarUsuario} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmarText}>Criar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", paddingTop: 56, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  fab: { backgroundColor: "#7c3aed", borderRadius: 20, padding: 8 },
  chips: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#e5e7eb" },
  chipAtivo: { backgroundColor: "#7c3aed" },
  chipText: { fontSize: 12, fontWeight: "500", color: "#374151" },
  chipTextoAtivo: { color: "#fff" },
  error: { color: "#dc2626", fontSize: 14, marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 64, gap: 12 },
  emptyText: { color: "#9ca3af", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 6, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardBloqueado: { opacity: 0.75 },
  cardRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  tipoTag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  tipoText: { fontSize: 12, fontWeight: "600" },
  bloqTag: { backgroundColor: "#fee2e2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  bloqText: { fontSize: 12, fontWeight: "600", color: "#dc2626" },
  nome: { fontSize: 15, fontWeight: "700", color: "#111827" },
  email: { fontSize: 13, color: "#6b7280" },
  meta: { flexDirection: "row", gap: 16, marginTop: 2 },
  metaText: { fontSize: 12, color: "#9ca3af" },
  btnBloquear: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, alignSelf: "flex-start", backgroundColor: "#fee2e2", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  btnDesbloquear: { backgroundColor: "#dcfce7" },
  btnBloquearText: { fontSize: 13, fontWeight: "600", color: "#dc2626" },
  btnDesbloquearText: { color: "#16a34a" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  input: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, fontSize: 14, color: "#111827" },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
  tipoOpcoes: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tipoOpcao: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f3f4f6", borderWidth: 1.5, borderColor: "transparent" },
  tipoOpcaoAtiva: { backgroundColor: "#ede9fe", borderColor: "#7c3aed" },
  tipoOpcaoText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  tipoOpcaoTextoAtivo: { color: "#7c3aed", fontWeight: "700" },
  modalAcoes: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalCancelar: { flex: 1, borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalCancelarText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  modalConfirmar: { flex: 1, backgroundColor: "#7c3aed", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalConfirmarText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});
