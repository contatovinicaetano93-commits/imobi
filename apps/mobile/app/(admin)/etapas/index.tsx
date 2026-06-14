import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi, type AdminEtapaValidar } from "../../../lib/api";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diasAtras(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? "hoje" : d === 1 ? "ontem" : `${d} dias`;
}

export default function ValidarEtapasScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AdminEtapaValidar[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await adminApi.etapasParaValidar();
      setItems(data);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { carregar(); }, []);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#7c3aed" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={s.header}>
        <Text style={s.titulo}>Validar Etapas</Text>
        {items.length > 0 && (
          <View style={s.badge}><Text style={s.badgeText}>{items.length}</Text></View>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.etapaId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} tintColor="#7c3aed" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyText}>Nenhuma etapa aguardando validação</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => router.push(`/(admin)/etapas/${item.etapaId}` as any)}
            activeOpacity={0.85}
          >
            <View style={s.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.obraNome} numberOfLines={1}>{item.obraNome}</Text>
                <Text style={s.etapaNome}>{item.nome}</Text>
                <Text style={s.construtor}>Construtor: {item.construtor}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </View>
            <View style={s.cardBottom}>
              <View style={s.chip}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#7c3aed" />
                <Text style={s.chipText}>Eng. aprovada</Text>
              </View>
              <Text style={s.meta}>{item.percentualObra}% da obra</Text>
              <Text style={[s.meta, { color: "#2563eb", fontWeight: "600" }]}>{brl(item.valorParcela)}</Text>
              <Text style={s.meta}>{diasAtras(item.aguardandoDesde)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  titulo: { fontSize: 22, fontWeight: "700", color: "#1e3a5f", flex: 1 },
  badge: { backgroundColor: "#7c3aed", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#e9d5ff" },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  obraNome: { fontSize: 15, fontWeight: "600", color: "#111827" },
  etapaNome: { fontSize: 13, color: "#4b5563", marginTop: 2 },
  construtor: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f3e8ff", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 12, fontWeight: "600", color: "#7c3aed" },
  meta: { fontSize: 12, color: "#6b7280" },
  emptyText: { marginTop: 12, fontSize: 15, color: "#9ca3af" },
});
