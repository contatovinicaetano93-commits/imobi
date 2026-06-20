import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import { obrasApi, type Obra } from "../../../lib/api";
import { cacheObrasList, getCachedObrasList } from "../../../lib/offline-cache";

const STATUS_LABEL: Record<string, string> = {
  PLANEJAMENTO: "Planejamento",
  EM_ANDAMENTO: "Em andamento",
  PAUSADA: "Pausada",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export default function ObrasScreen() {
  const router = useRouter();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const carregar = async () => {
    const net = await NetInfo.fetch();
    const online = net.isConnected && net.isInternetReachable !== false;

    if (!online) {
      const cached = await getCachedObrasList();
      if (cached) {
        setObras(cached);
        setFromCache(true);
        setError(null);
        return;
      }
      setError("Sem conexão. Nenhum dado em cache.");
      return;
    }

    try {
      const data = await obrasApi.listar();
      setObras(data);
      setFromCache(false);
      setError(null);
      await cacheObrasList(data);
    } catch (e: unknown) {
      const cached = await getCachedObrasList();
      if (cached) {
        setObras(cached);
        setFromCache(true);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : "Erro ao carregar obras");
      }
    }
  };

  useEffect(() => { carregar().finally(() => setLoading(false)); }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minhas Obras</Text>
      {fromCache && !error && (
        <Text style={styles.cacheHint}>Exibindo dados salvos offline</Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={obras}
        keyExtractor={(o) => o.obraId}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await carregar(); setRefreshing(false); }} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Nenhuma obra cadastrada.</Text></View>}
        renderItem={({ item }) => {
          const etapas = item.etapas ?? [];
          const concluidas = etapas.filter((e) => e.status === "CONCLUIDA").length;
          const progresso = etapas.length ? Math.round((concluidas / etapas.length) * 100) : 0;
          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/obras/${item.obraId}`)}>
              <View style={styles.cardHeader}>
                <Text style={styles.obraNome} numberOfLines={1}>{item.nome}</Text>
                <Text style={styles.progresso}>{progresso}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progresso}%` as any }]} />
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.meta}>{STATUS_LABEL[item.status] ?? item.status}</Text>
                <Text style={styles.meta}>{etapas.length} etapas</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16, paddingTop: 56 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 16 },
  cacheHint: { color: "#92400e", fontSize: 12, marginBottom: 8, fontWeight: "500" },
  error: { color: "#dc2626", fontSize: 14, marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyText: { color: "#9ca3af", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  obraNome: { fontSize: 16, fontWeight: "600", color: "#111827", flex: 1, marginRight: 8 },
  progresso: { fontSize: 16, fontWeight: "700", color: "#2563eb" },
  progressBar: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, marginBottom: 10, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#2563eb", borderRadius: 3 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  meta: { fontSize: 12, color: "#6b7280" },
});
