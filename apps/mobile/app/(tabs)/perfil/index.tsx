import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { apiClient } from "@imbobi/core";

type Usuario = {
  usuarioId: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  tipo: string;
  kycStatus: string;
  criadoEm: string;
};

export default function PerfilScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        if (!token) throw new Error("Token não encontrado");

        const data = await apiClient.get<Usuario>("/api/v1/usuarios/me", token);
        setUsuario(data);
      } catch (e: any) {
        setError(e.message ?? "Erro ao carregar perfil");
      } finally {
        setLoading(false);
      }
    };

    carregarUsuario();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Sair", "Deseja sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync("accessToken");
            await SecureStore.deleteItemAsync("refreshToken");
            router.replace("/(auth)/login");
          } catch (e) {
            Alert.alert("Erro", "Falha ao fazer logout");
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

  if (error || !usuario) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Usuário não encontrado"}</Text>
      </View>
    );
  }

  const kycStatusLabel: Record<string, string> = {
    PENDENTE: "Pendente",
    APROVADO: "Aprovado",
    REJEITADO: "Rejeitado",
    EM_ANALISE: "Em análise",
  };

  const tipoLabel: Record<string, string> = {
    TOMADOR: "Tomador de crédito",
    GESTOR_OBRA: "Gestor de obra",
    ADMIN: "Administrador",
    PARCEIRO: "Parceiro",
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const maskCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const maskPhone = (phone: string) => {
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Meu Perfil</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{usuario.nome}</Text>
        <Text style={styles.cardSubtitle}>{tipoLabel[usuario.tipo]}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Pessoais</Text>
        <InfoRow label="E-mail" value={usuario.email} />
        <InfoRow label="CPF" value={maskCPF(usuario.cpf)} />
        <InfoRow label="Telefone" value={maskPhone(usuario.telefone)} />
        <InfoRow label="Cadastro em" value={formatDate(usuario.criadoEm)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verificação de Identidade</Text>
        <View style={[styles.kycStatus, getKycStatusStyle(usuario.kycStatus)]}>
          <Text style={styles.kycLabel}>{kycStatusLabel[usuario.kycStatus] ?? usuario.kycStatus}</Text>
        </View>
        {usuario.kycStatus === "PENDENTE" && (
          <Text style={styles.kycHint}>
            Complete sua verificação de identidade para liberar mais funcionalidades.
          </Text>
        )}
        {usuario.kycStatus === "REJEITADO" && (
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkButtonText}>Reenviar documentos</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sair</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function getKycStatusStyle(status: string) {
  switch (status) {
    case "APROVADO":
      return { backgroundColor: "#dcfce7" };
    case "REJEITADO":
      return { backgroundColor: "#fee2e2" };
    case "EM_ANALISE":
      return { backgroundColor: "#fef9c3" };
    default:
      return { backgroundColor: "#f3f4f6" };
  }
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, paddingBottom: 40, gap: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "#dc2626", fontSize: 14 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  cardSubtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 4 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  infoLabel: { fontSize: 13, color: "#6b7280" },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#111827" },
  kycStatus: { borderRadius: 12, padding: 12, alignItems: "center" },
  kycLabel: { fontSize: 14, fontWeight: "600", color: "#111827" },
  kycHint: { fontSize: 12, color: "#6b7280", marginTop: 8, lineHeight: 18 },
  linkButton: { borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 8, borderWidth: 1.5, borderColor: "#2563eb" },
  linkButtonText: { color: "#2563eb", fontWeight: "600", fontSize: 14 },
  logoutButton: { backgroundColor: "#ef4444", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  logoutButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
