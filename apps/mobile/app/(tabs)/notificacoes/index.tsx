import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { notificacoesApi, type Notificacao } from "../../../lib/api";

export default function NotificacoesScreen() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await notificacoesApi.listar();
      setNotificacoes(data);
    } catch {
      // silent — show stale list
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const marcarLida = async (id: string) => {
    setNotificacoes((prev) =>
      prev.map((n) => (n.notificacaoId === id ? { ...n, lida: true } : n)),
    );
    notificacoesApi.marcarLida(id).catch(() => {});
  };

  const marcarTodas = async () => {
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    notificacoesApi.marcarTodasLidas().catch(() => {});
  };

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Notificações</Text>
        {naoLidas > 0 && (
          <TouchableOpacity onPress={marcarTodas}>
            <Text style={styles.marcarTodas}>Marcar todas como lidas</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notificacoes}
        keyExtractor={(item) => item.notificacaoId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} tintColor="#16a34a" />}
        contentContainerStyle={notificacoes.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>Nenhuma notificação ainda</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.lida && styles.cardNaoLida]}
            onPress={() => marcarLida(item.notificacaoId)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitulo}>{item.titulo}</Text>
              {!item.lida && <View style={styles.dot} />}
            </View>
            <Text style={styles.cardMensagem}>{item.mensagem}</Text>
            <Text style={styles.cardData}>
              {new Date(item.criadoEm).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  titulo: { fontSize: 22, fontWeight: "700", color: "#111827" },
  marcarTodas: { fontSize: 13, color: "#16a34a", fontWeight: "600" },
  listContent: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: "#9ca3af" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardNaoLida: { borderLeftWidth: 3, borderLeftColor: "#16a34a" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitulo: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16a34a", marginLeft: 8 },
  cardMensagem: { fontSize: 14, color: "#4b5563", lineHeight: 20, marginBottom: 8 },
  cardData: { fontSize: 12, color: "#9ca3af" },
});
