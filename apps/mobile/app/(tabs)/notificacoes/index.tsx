import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { notificacoesApi, type Notificacao } from "../../../lib/api";

export default function NotificacoesScreen() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setError(null);
      const data = await notificacoesApi.listar();
      setNotificacoes(data);
    } catch {
      setError("Não foi possível carregar as notificações.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleMarcarLida = async (id: string) => {
    try {
      await notificacoesApi.marcarLida(id);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
    } catch {
      // Silently fail — cosmetic action
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={carregar}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notificações</Text>
      {notificacoes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nenhuma notificação por enquanto.</Text>
        </View>
      ) : (
        <FlatList
          data={notificacoes}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); carregar(); }}
              tintColor="#16a34a"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, item.lida && styles.cardLida]}
              onPress={() => !item.lida && handleMarcarLida(item.id)}
              activeOpacity={item.lida ? 1 : 0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitulo, item.lida && styles.cardTituloLida]}>
                  {item.titulo}
                </Text>
                {!item.lida && <View style={styles.dot} />}
              </View>
              <Text style={styles.cardDescricao}>{item.descricao}</Text>
              <Text style={styles.cardData}>
                {new Date(item.criadoEm).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", padding: 16, paddingTop: 56, paddingBottom: 8 },
  list: { padding: 16, paddingTop: 8 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 80 },
  emptyText: { fontSize: 15, color: "#9ca3af", textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardLida: { opacity: 0.6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitulo: { fontSize: 15, fontWeight: "600", color: "#111827", flex: 1 },
  cardTituloLida: { color: "#6b7280" },
  cardDescricao: { fontSize: 14, color: "#4b5563", marginBottom: 8, lineHeight: 20 },
  cardData: { fontSize: 12, color: "#9ca3af" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16a34a", marginLeft: 8 },
  errorText: { fontSize: 15, color: "#ef4444", textAlign: "center", marginBottom: 16 },
  retryBtn: { backgroundColor: "#16a34a", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: "#fff", fontWeight: "600" },
});
