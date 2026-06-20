import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { UpdatePerfilUsuarioSchema } from "@imbobi/schemas";
import { usuariosApi, type UsuarioPerfil } from "../lib/api";

type Props = {
  visible: boolean;
  usuario: UsuarioPerfil;
  onClose: () => void;
  onSaved: (usuario: UsuarioPerfil) => void;
};

export function EditPerfilModal({ visible, usuario, onClose, onSaved }: Props) {
  const [nome, setNome] = useState(usuario.nome);
  const [telefone, setTelefone] = useState(usuario.telefone ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setErro(null);
    const parsed = UpdatePerfilUsuarioSchema.safeParse({ nome, telefone });
    if (!parsed.success) {
      setErro(parsed.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }
    setSaving(true);
    try {
      const updated = await usuariosApi.atualizarPerfil(parsed.data);
      onSaved(updated);
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Editar perfil</Text>

          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            autoComplete="name"
            accessibilityLabel="Nome completo"
          />

          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            autoComplete="tel"
            accessibilityLabel="Telefone"
          />

          {erro && <Text style={styles.erro} accessibilityRole="alert">{erro}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  title: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 14, color: "#111827" },
  erro: { color: "#dc2626", fontSize: 13, marginBottom: 12 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" },
  cancelText: { color: "#374151", fontWeight: "600" },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#16a34a", alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "700" },
});
