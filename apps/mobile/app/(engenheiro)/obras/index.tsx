import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { engenheiroApi, type ObraEngenheiro } from "../../../lib/api";
import { formatarBRL } from "../../../lib/api";

export default function ObrasEngenheiroScreen() {
  const [obras, setObras] = useState<ObraEngenheiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const data = await engenheiroApi.obras();
      setObras(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar obras");
    }
  }, []);

  useEffect(() => { carregar().finally(() => setLoading(false)); }, [carregar]);

  const onRefresh = async () => { setRefreshing(true); await carregar(); setRefreshing(false); };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#d97706" /></View>;

  return (
    <View style={s.container}>
      <Text style={s.title}>Obras</Text>
      {error && <Text style={s.error}>{error}</Text>}
      <FlatList
        data={obras}
        keyExtractor={(o) => o.obraId}
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="construct-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyText}>Nenhuma obra atribuída.</Text>
          </View>
        }
        renderItem={({ item: o }) => (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.nome} numberOfLines={1}>{o.nome}</Text>
              <Text style={s.pct}>{o.progresso}%</Text>
            </View>
            <View style={s.bar}>
              <View style={[s.barFill, { width: `${Math.min(o.progresso, 100)}%` as any }]} />
            </View>
            {o.etapaAtual ? (
              <Text style={s.etapa}>Etapa atual: {o.etapaAtual}</Text>
            ) : null}
            <Text style={s.valor}>{formatarBRL(o.valorExecutado)} executado de {formatarBRL(o.valorTotal)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", paddingTop: 56, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 16 },
  error: { color: "#dc2626", fontSize: 14, marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 64, gap: 12 },
  emptyText: { color: "#9ca3af", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nome: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1, marginRight: 8 },
  pct: { fontSize: 16, fontWeight: "800", color: "#d97706" },
  bar: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#d97706", borderRadius: 3 },
  etapa: { fontSize: 12, color: "#6b7280" },
  valor: { fontSize: 13, color: "#9ca3af" },
});
