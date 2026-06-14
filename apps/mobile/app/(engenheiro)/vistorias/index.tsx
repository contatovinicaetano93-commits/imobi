import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { vistoriaApi, type VistoriaItem } from "../../../lib/api";

const STATUS_LABEL: Record<string, { label: string; cor: string; icon: string }> = {
  AGUARDANDO_VISTORIA: { label: "Aguardando", cor: "#f59e0b", icon: "time-outline" },
  APROVADA_ENGENHEIRO: { label: "Aguard. Admin", cor: "#8b5cf6", icon: "hourglass-outline" },
  REPROVADA:           { label: "Reprovada",   cor: "#ef4444", icon: "close-circle-outline" },
  CONCLUIDA:           { label: "Concluída",   cor: "#16a34a", icon: "checkmark-circle-outline" },
};

function diasAtras(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  return `há ${d} dias`;
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VistoriasScreen() {
  const router = useRouter();
  const [items, setItems] = useState<VistoriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      setErro("");
      const data = await vistoriaApi.listar();
      setItems(data);
    } catch {
      setErro("Não foi possível carregar as vistorias.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); }, []);

  const pendentes = items.filter((i) => i.status === "AGUARDANDO_VISTORIA");
  const outros = items.filter((i) => i.status !== "AGUARDANDO_VISTORIA");

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.titulo}>Vistorias</Text>
        {pendentes.length > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{pendentes.length}</Text>
          </View>
        )}
      </View>

      {erro ? (
        <View style={s.center}>
          <Text style={s.erroText}>{erro}</Text>
          <TouchableOpacity style={s.btnRetentar} onPress={carregar}>
            <Text style={s.btnRetentarText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[...pendentes, ...outros]}
          keyExtractor={(i) => i.etapaId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} tintColor="#2563eb" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color="#d1d5db" />
              <Text style={s.emptyText}>Nenhuma vistoria pendente</Text>
            </View>
          }
          renderItem={({ item }) => {
            const st = STATUS_LABEL[item.status] ?? { label: item.status, cor: "#6b7280", icon: "ellipse-outline" };
            const urgente = item.status === "AGUARDANDO_VISTORIA" &&
              Date.now() - new Date(item.aguardandoDesde).getTime() > 2 * 86400000;
            return (
              <TouchableOpacity
                style={[s.card, urgente && s.cardUrgente]}
                onPress={() => router.push(`/(engenheiro)/vistorias/${item.etapaId}` as any)}
                activeOpacity={0.85}
              >
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.obraNome} numberOfLines={1}>{item.obraNome}</Text>
                    <Text style={s.etapaNome} numberOfLines={1}>{item.etapaNome}</Text>
                    <Text style={s.endereco} numberOfLines={1}>{item.obraEndereco}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </View>
                <View style={s.cardBottom}>
                  <View style={[s.statusChip, { backgroundColor: st.cor + "20" }]}>
                    <Ionicons name={st.icon as any} size={13} color={st.cor} />
                    <Text style={[s.statusText, { color: st.cor }]}>{st.label}</Text>
                  </View>
                  <Text style={s.meta}>{item.totalEvidencias} foto{item.totalEvidencias !== 1 ? "s" : ""}</Text>
                  <Text style={s.meta}>{brl(item.valorLiberacao)}</Text>
                  <Text style={[s.meta, urgente && { color: "#ef4444", fontWeight: "600" }]}>
                    {diasAtras(item.aguardandoDesde)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  titulo: { fontSize: 22, fontWeight: "700", color: "#1e3a5f", flex: 1 },
  badge: { backgroundColor: "#ef4444", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#f3f4f6" },
  cardUrgente: { borderColor: "#fca5a5", backgroundColor: "#fff7f7" },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  obraNome: { fontSize: 15, fontWeight: "600", color: "#111827" },
  etapaNome: { fontSize: 13, color: "#4b5563", marginTop: 2 },
  endereco: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: "600" },
  meta: { fontSize: 12, color: "#6b7280" },
  emptyText: { marginTop: 12, fontSize: 15, color: "#9ca3af" },
  erroText: { fontSize: 14, color: "#ef4444", marginBottom: 12, textAlign: "center" },
  btnRetentar: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#2563eb", borderRadius: 8 },
  btnRetentarText: { color: "#fff", fontWeight: "600" },
});
