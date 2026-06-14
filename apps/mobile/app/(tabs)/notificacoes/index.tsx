import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { notificacoesApi, type Notificacao } from "../../../lib/api";

const TIPO_EMOJI: Record<string, string> = {
  ETAPA_APROVADA: "✅",
  ETAPA_REPROVADA: "❌",
  ETAPA_SUBMETIDA: "📤",
  PARCELA_LIBERADA: "💰",
  PARCELA_FALHA: "⚠️",
  CREDITO_APROVADO: "🎉",
  KYC_APROVADO: "✅",
  KYC_REJEITADO: "❌",
  KYC_ENVIADO: "📄",
  OBRA_CRIADA: "🏗️",
  VISTORIA_PENDENTE: "🔍",
  COMITE_ABERTO: "🗳️",
  COMITE_DECISAO: "📋",
  PARECER_SOLICITADO: "📝",
  EVIDENCIA_VALIDADA: "📸",
  SCORE_ATUALIZADO: "📊",
};

function formatarData(iso: string): string {
  const d = new Date(iso);
  const agora = new Date();
  const diffMs = agora.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d atrás`;
  return d.toLocaleDateString("pt-BR");
}

export default function NotificacoesScreen() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await notificacoesApi.listar(50, 0);
      setNotificacoes(data.notificacoes);
      setTotal(data.total);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregar();
  }, [carregar]);

  const marcarComoLida = async (notificacaoId: string) => {
    setNotificacoes((prev) =>
      prev.map((n) => n.notificacaoId === notificacaoId ? { ...n, lida: true } : n)
    );
    try {
      await notificacoesApi.marcarComoLida(notificacaoId);
    } catch { /* optimistic update, ignore error */ }
  };

  const marcarTodas = async () => {
    setMarcandoTodas(true);
    try {
      await notificacoesApi.marcarTodasComoLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch { /* ignore */ } finally {
      setMarcandoTodas(false);
    }
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notificações</Text>
          {naoLidas > 0 && (
            <Text style={styles.subtitle}>{naoLidas} não {naoLidas === 1 ? "lida" : "lidas"}</Text>
          )}
        </View>
        {naoLidas > 0 && (
          <TouchableOpacity onPress={marcarTodas} disabled={marcandoTodas}>
            <Text style={styles.marcarTodas}>
              {marcandoTodas ? "..." : "Marcar todas"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notificacoes}
        keyExtractor={(item) => item.notificacaoId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        contentContainerStyle={notificacoes.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyText}>Nenhuma notificação ainda</Text>
            <Text style={styles.emptySubtext}>As atualizações do seu fluxo aparecerão aqui</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.lida && styles.cardNaoLido]}
            onPress={() => !item.lida && marcarComoLida(item.notificacaoId)}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.emoji}>{TIPO_EMOJI[item.tipo] ?? "🔔"}</Text>
              {!item.lida && <View style={styles.dotUnread} />}
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, !item.lida && styles.cardTitleBold]}>
                {item.titulo}
              </Text>
              <Text style={styles.cardMsg} numberOfLines={2}>{item.mensagem}</Text>
              <Text style={styles.cardTime}>{formatarData(item.criadoEm)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 13, color: "#16a34a", marginTop: 2, fontWeight: "500" },
  marcarTodas: { fontSize: 13, color: "#16a34a", fontWeight: "600" },
  list: { padding: 12, gap: 8 },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 17, fontWeight: "600", color: "#374151", textAlign: "center" },
  emptySubtext: { fontSize: 14, color: "#9ca3af", textAlign: "center", marginTop: 8 },
  card: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 14,
    padding: 14, gap: 12, shadowColor: "#000", shadowOpacity: 0.03,
    shadowRadius: 4, elevation: 1,
  },
  cardNaoLido: { backgroundColor: "#f0fdf4", borderLeftWidth: 3, borderLeftColor: "#16a34a" },
  cardLeft: { alignItems: "center", gap: 4, paddingTop: 2 },
  emoji: { fontSize: 22 },
  dotUnread: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16a34a" },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 14, color: "#374151" },
  cardTitleBold: { fontWeight: "700", color: "#111827" },
  cardMsg: { fontSize: 13, color: "#6b7280", lineHeight: 18 },
  cardTime: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
});
