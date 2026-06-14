import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { notificacoesApi, type Notificacao } from "../../../lib/api";

type TipoConfig = { icon: keyof typeof Ionicons.glyphMap; cor: string };

const TIPO_CONFIG: Record<string, TipoConfig> = {
  ETAPA_APROVADA:    { icon: "checkmark-circle", cor: "#16a34a" },
  ETAPA_REPROVADA:   { icon: "close-circle",     cor: "#dc2626" },
  PARCELA_LIBERADA:  { icon: "cash",             cor: "#16a34a" },
  PARCELA_FALHA:     { icon: "alert-circle",     cor: "#dc2626" },
  CREDITO_APROVADO:  { icon: "ribbon",           cor: "#16a34a" },
  KYC_APROVADO:      { icon: "shield-checkmark", cor: "#16a34a" },
  KYC_REJEITADO:     { icon: "shield-outline",   cor: "#dc2626" },
  OBRA_CRIADA:       { icon: "home",             cor: "#2563eb" },
  SCORE_ATUALIZADO:  { icon: "stats-chart",      cor: "#7c3aed" },
  VISTORIA_PENDENTE: { icon: "eye",              cor: "#d97706" },
};

function formatarData(iso: string) {
  const d = new Date(iso);
  const agora = new Date();
  const diffMs = agora.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d atrás`;
  return d.toLocaleDateString("pt-BR");
}

export default function AvisosScreen() {
  const [avisos, setAvisos] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const data = await notificacoesApi.listar(50, 0);
      setAvisos(data.notificacoes);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar avisos");
    }
  }, []);

  useEffect(() => {
    carregar().finally(() => setLoading(false));
  }, [carregar]);

  const onRefresh = async () => {
    setRefreshing(true);
    await carregar();
    setRefreshing(false);
  };

  const marcarLida = async (id: string) => {
    try {
      await notificacoesApi.marcarLida(id);
      setAvisos((prev) =>
        prev.map((n) => (n.notificacaoId === id ? { ...n, lida: true } : n))
      );
    } catch {
      // falha silenciosa — o estado visual não muda
    }
  };

  const marcarTodas = async () => {
    try {
      await notificacoesApi.marcarTodasLidas();
      setAvisos((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível marcar todas como lidas.");
    }
  };

  const naolidas = avisos.filter((n) => !n.lida).length;

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
        <View>
          <Text style={styles.title}>Avisos</Text>
          {naolidas > 0 && (
            <Text style={styles.badge}>{naolidas} não lido{naolidas > 1 ? "s" : ""}</Text>
          )}
        </View>
        {naolidas > 0 && (
          <TouchableOpacity onPress={marcarTodas} style={styles.marcarBtn}>
            <Text style={styles.marcarBtnText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={avisos}
        keyExtractor={(n) => n.notificacaoId}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Nenhum aviso por aqui.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = TIPO_CONFIG[item.tipo] ?? { icon: "information-circle", cor: "#6b7280" };
          return (
            <TouchableOpacity
              style={[styles.card, !item.lida && styles.cardUnread]}
              activeOpacity={0.7}
              onPress={() => !item.lida && marcarLida(item.notificacaoId)}
            >
              <View style={[styles.iconWrap, { backgroundColor: cfg.cor + "18" }]}>
                <Ionicons name={cfg.icon} size={24} color={cfg.cor} />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, !item.lida && styles.cardTitleUnread]}>
                  {item.titulo}
                </Text>
                <Text style={styles.cardMsg} numberOfLines={2}>
                  {item.mensagem}
                </Text>
                <Text style={styles.cardTime}>{formatarData(item.criadoEm)}</Text>
              </View>
              {!item.lida && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", paddingTop: 56, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  badge: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  marcarBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: "#d1d5db" },
  marcarBtnText: { fontSize: 12, color: "#374151", fontWeight: "500" },
  error: { color: "#dc2626", fontSize: 14, marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 64, gap: 12 },
  emptyText: { color: "#9ca3af", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardUnread: { backgroundColor: "#f0fdf4" },
  iconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 14, fontWeight: "500", color: "#374151" },
  cardTitleUnread: { fontWeight: "700", color: "#111827" },
  cardMsg: { fontSize: 13, color: "#6b7280", lineHeight: 18 },
  cardTime: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16a34a", marginTop: 4, flexShrink: 0 },
});
