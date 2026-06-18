import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { usuariosApi, authApi, type UsuarioPerfil } from "../../../lib/api";
import { emitAuthState } from "../../../lib/auth-state";

export default function PerfilScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const carregarPerfil = async () => {
      try {
        const data = await usuariosApi.obterPerfil();
        setUsuario(data);
      } catch (e: any) {
        console.error("Erro ao carregar perfil:", e);
      } finally {
        setLoading(false);
      }
    };

    carregarPerfil();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Sair", "Tem certeza que deseja sair da sua conta?", [
      {
        text: "Cancelar",
        onPress: () => {},
        style: "cancel",
      },
      {
        text: "Sair",
        onPress: async () => {
          setLoggingOut(true);
          try {
            const refreshToken = await SecureStore.getItemAsync("refreshToken");
            if (refreshToken) {
              await authApi.logout(refreshToken);
            }
          } catch (e) {
            console.error("Erro ao fazer logout:", e);
          } finally {
            await SecureStore.deleteItemAsync("accessToken");
            await SecureStore.deleteItemAsync("refreshToken");
            emitAuthState(false);
            router.replace("/(auth)/login");
          }
        },
        style: "destructive",
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Meu Perfil</Text>

      {usuario && (
        <>
          <View style={styles.card}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{usuario.nome.charAt(0).toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.name}>{usuario.nome}</Text>
            <Text style={styles.email}>{usuario.email}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações Pessoais</Text>

            <View style={styles.infoRow}>
              <Text style={styles.label}>CPF</Text>
              <Text style={styles.value}>
                {usuario.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Telefone</Text>
              <Text style={styles.value}>
                {usuario.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3")}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Tipo de Usuário</Text>
              <Text style={styles.value}>
                {usuario.tipo === "TOMADOR"
                  ? "Tomador"
                  : usuario.tipo === "GESTOR_OBRA"
                  ? "Gestor de Obra"
                  : usuario.tipo}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verificação</Text>

            <View style={styles.kycRow}>
              <Text style={styles.label}>Status KYC</Text>
              <View
                style={[
                  styles.badge,
                  usuario.kycStatus === "APROVADO"
                    ? styles.badgeAprovado
                    : usuario.kycStatus === "EM_ANALISE"
                    ? styles.badgeAnalise
                    : styles.badgePendente,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    usuario.kycStatus === "APROVADO"
                      ? styles.badgeTextAprovado
                      : usuario.kycStatus === "EM_ANALISE"
                      ? styles.badgeTextAnalise
                      : styles.badgeTextPendente,
                  ]}
                >
                  {usuario.kycStatus === "APROVADO"
                    ? "Aprovado"
                    : usuario.kycStatus === "EM_ANALISE"
                    ? "Em análise"
                    : usuario.kycStatus === "REJEITADO"
                    ? "Rejeitado"
                    : "Pendente"}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
            <Text style={styles.logoutBtnText}>{loggingOut ? "Saindo..." : "Sair da Conta"}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  avatarContainer: { marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#16a34a", justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 32, fontWeight: "700", color: "#fff" },
  name: { fontSize: 20, fontWeight: "700", color: "#111827" },
  email: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 12 },
  infoRow: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kycRow: { backgroundColor: "#fff", borderRadius: 12, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 14, color: "#6b7280" },
  value: { fontSize: 14, fontWeight: "600", color: "#111827" },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeAprovado: { backgroundColor: "#dcfce7" },
  badgeAnalise: { backgroundColor: "#dbeafe" },
  badgePendente: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 12, fontWeight: "600" },
  badgeTextAprovado: { color: "#166534" },
  badgeTextAnalise: { color: "#1d4ed8" },
  badgeTextPendente: { color: "#6b7280" },
  logoutBtn: { backgroundColor: "#ef4444", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 16 },
  logoutBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
