import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { apiClient, ApiError } from "@imbobi/core";
import { AtualizarPerfilSchema } from "@imbobi/schemas";
import { haptics } from "../../../lib/haptics";

export interface PerfilData {
  usuarioId: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: string;
  criadoEm: string;
}

export default function PerfilScreen() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await SecureStore.getItemAsync("accessToken");
      const data = await apiClient.get<PerfilData>(
        "/api/v1/usuarios/meu-perfil",
        token ?? undefined
      );
      setPerfil(data);
      setNome(data.nome);
      setTelefone(data.telefone);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erro ao carregar perfil";
      setError(message);
      await haptics.error();
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    try {
      setSaving(true);
      setError(null);
      await haptics.impact();

      const validado = AtualizarPerfilSchema.safeParse({ nome, telefone });
      if (!validado.success) {
        const errorMsg = validado.error.errors[0]?.message || "Dados inválidos";
        setError(errorMsg);
        await haptics.error();
        return;
      }

      const token = await SecureStore.getItemAsync("accessToken");
      const response = await fetch(
        "http://localhost:3000/api/v1/usuarios/meu-perfil",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token ?? ""}`,
          },
          body: JSON.stringify(validado.data),
        }
      );

      if (!response.ok) {
        throw new ApiError(
          response.status,
          "Erro ao atualizar perfil",
          "PROFILE_UPDATE_ERROR"
        );
      }

      const updatedData = await response.json();
      setPerfil(updatedData);
      setEditing(false);
      await haptics.success();
      Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erro ao salvar perfil";
      setError(message);
      await haptics.error();
      Alert.alert("Erro", message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Deseja sair da sua conta?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync("accessToken");
            await haptics.success();
            router.replace("/(auth)/login");
          } catch (err) {
            Alert.alert("Erro", "Erro ao fazer logout");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!perfil) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Perfil</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || "Erro ao carregar perfil"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={carregarPerfil}
            accessibilityLabel="Tentar novamente"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Meu Perfil</Text>

      {error && !editing && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {perfil.nome.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.avatarName}>{perfil.nome}</Text>
        <Text style={styles.avatarEmail}>{perfil.email}</Text>
      </View>

      {!editing ? (
        <>
          {/* View Mode */}
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Nome</Text>
              <Text style={styles.value}>{perfil.nome}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{perfil.email}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.label}>Telefone</Text>
              <Text style={styles.value}>{perfil.telefone}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.label}>Tipo de Conta</Text>
              <Text style={styles.value}>
                {perfil.tipo === "TOMADOR" ? "Tomador" : "Gestor"}
              </Text>
            </View>
          </View>

          {/* Settings Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Configurações</Text>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                haptics.tap();
                setEditing(true);
              }}
              accessibilityLabel="Editar perfil"
              accessibilityRole="button"
            >
              <Text style={styles.settingItemIcon}>✏️</Text>
              <View style={styles.settingItemContent}>
                <Text style={styles.settingItemTitle}>Editar Perfil</Text>
                <Text style={styles.settingItemSubtitle}>Nome e telefone</Text>
              </View>
              <Text style={styles.settingItemArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                haptics.tap();
                // TODO: Navigate to notifications settings
              }}
              accessibilityLabel="Notificações"
              accessibilityRole="button"
            >
              <Text style={styles.settingItemIcon}>🔔</Text>
              <View style={styles.settingItemContent}>
                <Text style={styles.settingItemTitle}>Notificações</Text>
                <Text style={styles.settingItemSubtitle}>Gerenciar alertas</Text>
              </View>
              <Text style={styles.settingItemArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                haptics.tap();
                // TODO: Navigate to privacy settings
              }}
              accessibilityLabel="Privacidade"
              accessibilityRole="button"
            >
              <Text style={styles.settingItemIcon}>🔒</Text>
              <View style={styles.settingItemContent}>
                <Text style={styles.settingItemTitle}>Privacidade</Text>
                <Text style={styles.settingItemSubtitle}>Dados e segurança</Text>
              </View>
              <Text style={styles.settingItemArrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* About Section */}
          <View style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>Sobre</Text>
            <View style={styles.aboutItem}>
              <Text style={styles.aboutLabel}>Versão do App</Text>
              <Text style={styles.aboutValue}>1.0.0</Text>
            </View>
            <View style={styles.aboutItem}>
              <Text style={styles.aboutLabel}>Data de Acesso</Text>
              <Text style={styles.aboutValue}>
                {new Date(perfil.criadoEm).toLocaleDateString("pt-BR")}
              </Text>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            accessibilityLabel="Logout"
            accessibilityRole="button"
            accessibilityHint="Toca para sair da sua conta"
          >
            <Text style={styles.logoutButtonText}>Sair da Conta</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Edit Mode */}
          <View style={styles.card}>
            <View style={styles.formField}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                value={nome}
                onChangeText={setNome}
                placeholder="Digite seu nome"
                editable={!saving}
                accessibilityLabel="Nome"
                accessibilityHint="Digite seu nome completo"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Telefone</Text>
              <TextInput
                style={styles.input}
                value={telefone}
                onChangeText={setTelefone}
                placeholder="Digite seu telefone"
                keyboardType="phone-pad"
                editable={!saving}
                accessibilityLabel="Telefone"
                accessibilityHint="Digite seu telefone com DDD"
              />
            </View>

            <Text style={styles.helperText}>
              Email não pode ser alterado
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              saving && styles.primaryButtonDisabled,
            ]}
            onPress={handleSalvar}
            disabled={saving}
            accessibilityLabel="Salvar Alterações"
            accessibilityRole="button"
            accessibilityState={{ disabled: saving }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Salvar Alterações</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setEditing(false);
              setNome(perfil.nome);
              setTelefone(perfil.telefone);
            }}
            disabled={saving}
            accessibilityLabel="Cancelar"
            accessibilityRole="button"
            accessibilityState={{ disabled: saving }}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 24 },
  errorContainer: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
  },
  avatarName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  avatarEmail: {
    fontSize: 14,
    color: "#6b7280",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  value: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  formField: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    fontSize: 14,
    color: "#111827",
  },
  helperText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  settingItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingItemContent: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  settingItemSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  settingItemArrow: {
    fontSize: 20,
    color: "#16a34a",
  },
  aboutSection: {
    marginBottom: 24,
  },
  aboutItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  aboutLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  aboutValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  logoutButton: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fca5a5",
    marginTop: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc2626",
  },
});
