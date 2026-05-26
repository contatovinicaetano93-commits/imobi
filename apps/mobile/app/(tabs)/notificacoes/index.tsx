import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "@imbobi/core";

type Notificacao = {
  notificacaoId: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  criadoEm: string;
  obraId?: string;
  creditoId?: string;
};

export default function NotificacoesScreen() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarNotificacoes = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (!token) throw new Error("Não autenticado");

      const data = await apiClient.get<Notificacao[]>("/api/v1/notificacoes", token);
      setNotificacoes(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar notificações");
    }
  };

  useEffect(() => {
    carregarNotificacoes().finally(() => setLoading(false));
  }, []);

  const handleMarcarComoLida = async (id: string) => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (!token) return;

      await apiClient.post(`/api/v1/notificacoes/${id}/marcar-lida`, {}, token);
      setNotificacoes((prev) =>
        prev.map((n) => (n.notificacaoId === id ? { ...n, lida: true } : n))
      );
    } catch (e) {
      // Silenciosamente ignora erro
    }
  };

  const handleMarcarTodasComoLidas = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (!token) return;

      await apiClient.post("/api/v1/notificacoes/marcar-todas-lidas", {}, token);
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (e) {
      // Silenciosamente ignora erro
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const naoLidas = notificacoes.filter((n) => !n.lida);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "ETAPA_CONCLUIDA":
        return "✅";
      case "CREDITO_LIBERADO":
        return "💰";
      case "EVIDENCIA_VALIDADA":
        return "📸";
      case "EVIDENCIA_REJEITADA":
        return "❌";
      case "VISTORIA_AGENDADA":
        return "📅";
      case "PARCEIRO_ENCONTRADO":
        return "🤝";
      default:
        return "📢";
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      ETAPA_CONCLUIDA: "Etapa Concluída",
      CREDITO_LIBERADO: "Crédito Liberado",
      EVIDENCIA_VALIDADA: "Evidência Validada",
      EVIDENCIA_REJEITADA: "Evidência Rejeitada",
      VISTORIA_AGENDADA: "Vistoria Agendada",
      PARCEIRO_ENCONTRADO: "Parceiro Encontrado",
    };
    return labels[tipo] ?? "Notificação";
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const agora = new Date();
    const diff = agora.getTime() - d.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return "Agora";
    if (minutos < 60) return `${minutos}m atrás`;
    if (horas < 24) return `${horas}h atrás`;
    if (dias < 7) return `${dias}d atrás`;
    return d.toLocaleDateString("pt-BR");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notificações</Text>
        {naoLidas.length > 0 && (
          <TouchableOpacity onPress={handleMarcarTodasComoLidas}>
            <Text style={styles.headerLink}>Marcar tudo como lido</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={notificacoes}
        keyExtractor={(n) => n.notificacaoId}
        contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await carregarNotificacoes();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>Nenhuma notificação no momento</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.lida && styles.cardUnread]}
            onPress={() => !item.lida && handleMarcarComoLida(item.notificacaoId)}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.icon}>{getTipoIcon(item.tipo)}</Text>
                <View style={styles.cardText}>
                  <Text style={styles.titulo}>{item.titulo}</Text>
                  <Text style={styles.tipo}>{getTipoLabel(item.tipo)}</Text>
                </View>
                {!item.lida && <View style={styles.dot} />}
              </View>
              <Text style={styles.mensagem}>{item.mensagem}</Text>
              <Text style={styles.timestamp}>{formatDate(item.criadoEm)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", paddingTop: 56 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  headerLink: { fontSize: 13, color: "#2563eb", fontWeight: "600" },
  error: { color: "#dc2626", fontSize: 14, marginHorizontal: 16, marginBottom: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#9ca3af", fontSize: 14 },
  card: { backgroundColor: "#fff", marginHorizontal: 12, borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: "#f3f4f6", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  cardUnread: { borderLeftColor: "#2563eb", backgroundColor: "#f0f9ff" },
  cardContent: { gap: 8 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { fontSize: 24 },
  cardText: { flex: 1, gap: 2 },
  titulo: { fontSize: 14, fontWeight: "600", color: "#111827" },
  tipo: { fontSize: 12, color: "#6b7280" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563eb" },
  mensagem: { fontSize: 13, color: "#6b7280", lineHeight: 18 },
  timestamp: { fontSize: 11, color: "#9ca3af" },
});
