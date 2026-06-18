import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, ScrollView,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../components/ScreenHeader";
import { notificacoesApi, type Notificacao } from "../../../lib/api";

type Filtro = "nao_lidas" | "lidas" | "todas";

const TIPO_ICON: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  ETAPA_APROVADA:     { icon: "checkmark-circle", color: "#166534", bg: "#DCFCE7" },
  ETAPA_REPROVADA:    { icon: "close-circle", color: "#991B1B", bg: "#FEE2E2" },
  PARCELA_LIBERADA:   { icon: "cash", color: "#166534", bg: "#DCFCE7" },
  CREDITO_APROVADO:   { icon: "card", color: "#1B4FD8", bg: "#EEF3FF" },
  KYC_APROVADO:       { icon: "shield-checkmark", color: "#166534", bg: "#DCFCE7" },
  KYC_REJEITADO:      { icon: "shield", color: "#991B1B", bg: "#FEE2E2" },
  OBRA_CRIADA:        { icon: "business", color: "#1B4FD8", bg: "#EEF3FF" },
  EVIDENCIA_VALIDADA: { icon: "camera", color: "#166534", bg: "#DCFCE7" },
};

function formatarData(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
  return d.toLocaleDateString("pt-BR");
}

export default function NotificacoesScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("nao_lidas");
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<Notificacao | null>(null);

  const carregar = useCallback(async () => {
    try {
      let list: Notificacao[];
      if (filtro === "nao_lidas") {
        list = await notificacoesApi.listarNaoLidas();
      } else if (filtro === "lidas") {
        const data = await notificacoesApi.listarPorStatus(true, 50, 0);
        list = data.notificacoes;
      } else {
        const data = await notificacoesApi.listar(50, 0);
        list = data.notificacoes;
      }
      setNotificacoes(list);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtro]);

  useEffect(() => { setLoading(true); carregar(); }, [carregar]);

  const marcarComoLida = async (n: Notificacao) => {
    setSelecionada(n);
    if (!n.lida) {
      setNotificacoes((prev) => prev.map((x) => x.notificacaoId === n.notificacaoId ? { ...x, lida: true } : x));
      try { await notificacoesApi.marcarComoLida(n.notificacaoId); } catch { /* ignore */ }
    }
  };

  const marcarTodas = async () => {
    try {
      await notificacoesApi.marcarTodasComoLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      if (filtro === "nao_lidas") setNotificacoes([]);
    } catch { /* ignore */ }
  };

  const abrirLink = (n: Notificacao) => {
    if (!n.link) return;
    if (n.link.includes("/obras")) router.push("/(tabs)/obras");
    else if (n.link.includes("/credito")) router.navigate("/(tabs)/credito");
    else if (n.link.includes("/documentos") || n.link.includes("/kyc")) router.push("/documentos");
    else if (n.link.includes("/perfil")) router.navigate("/(tabs)/perfil");
  };

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1B4FD8" /></View>;
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Central de avisos"
        subtitle="Notificações lidas e não lidas"
        right={
          filtro === "nao_lidas" && notificacoes.length > 0 ? (
            <TouchableOpacity onPress={marcarTodas}><Ionicons name="checkmark-done" size={22} color="#1B4FD8" /></TouchableOpacity>
          ) : undefined
        }
      />

      <View style={styles.tabs}>
        {(["nao_lidas", "lidas", "todas"] as Filtro[]).map((f) => (
          <TouchableOpacity key={f} style={[styles.tab, filtro === f && styles.tabActive]} onPress={() => setFiltro(f)}>
            <Text style={[styles.tabText, filtro === f && styles.tabTextActive]}>
              {f === "nao_lidas" ? "Não lidas" : f === "lidas" ? "Lidas" : "Todas"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {erro ? (
        <View style={styles.erroWrap}>
          <Text style={styles.erroText}>{erro}</Text>
          <TouchableOpacity onPress={() => { setLoading(true); carregar(); }}><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notificacoes}
          keyExtractor={(item) => item.notificacaoId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} tintColor="#1B4FD8" />}
          contentContainerStyle={notificacoes.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={36} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {filtro === "nao_lidas" ? "Nenhuma mensagem nova" : filtro === "lidas" ? "Nenhuma mensagem lida" : "Nenhuma mensagem"}
              </Text>
              <Text style={styles.emptySub}>Atualizações de obras, crédito e comitê aparecem aqui</Text>
            </View>
          }
          renderItem={({ item }) => {
            const meta = TIPO_ICON[item.tipo] ?? { icon: "notifications" as const, color: "#64748B", bg: "#F1F5F9" };
            return (
              <TouchableOpacity style={[styles.card, !item.lida && styles.cardUnread]} onPress={() => marcarComoLida(item)} activeOpacity={0.75}>
                <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={20} color={meta.color} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, !item.lida && styles.bold]}>{item.titulo}</Text>
                  <Text style={styles.cardMsg} numberOfLines={2}>{item.mensagem}</Text>
                  <Text style={styles.cardTime}>{formatarData(item.criadoEm)}{item.lida ? " · lida" : ""}</Text>
                </View>
                {!item.lida && <View style={styles.dot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={!!selecionada} animationType="slide" transparent onRequestClose={() => setSelecionada(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{selecionada?.titulo}</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalMsg}>{selecionada?.mensagem}</Text>
              <Text style={styles.modalTime}>{selecionada ? new Date(selecionada.criadoEm).toLocaleString("pt-BR") : ""}</Text>
            </ScrollView>
            {selecionada?.link ? (
              <TouchableOpacity style={styles.modalLinkBtn} onPress={() => { abrirLink(selecionada!); setSelecionada(null); }}>
                <Text style={styles.modalLinkText}>Abrir no app</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.modalBtn} onPress={() => setSelecionada(null)}>
              <Text style={styles.modalBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabs: { flexDirection: "row", padding: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center" },
  tabActive: { backgroundColor: "#EEF3FF", borderColor: "#1B4FD8" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  tabTextActive: { color: "#1B4FD8" },
  list: { padding: 12, gap: 8 },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 40, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  emptySub: { fontSize: 14, color: "#64748B", textAlign: "center" },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  cardUnread: { borderColor: "#1B4FD8", backgroundColor: "#FAFBFF" },
  iconWrap: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 14, color: "#334155" },
  bold: { fontWeight: "700", color: "#0F172A" },
  cardMsg: { fontSize: 13, color: "#64748B", lineHeight: 18 },
  cardTime: { fontSize: 11, color: "#94A3B8" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1B4FD8", marginTop: 6 },
  erroWrap: { padding: 24, alignItems: "center", gap: 12 },
  erroText: { color: "#991B1B", textAlign: "center" },
  retry: { color: "#1B4FD8", fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: "70%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 12 },
  modalScroll: { maxHeight: 240 },
  modalMsg: { fontSize: 15, color: "#334155", lineHeight: 22 },
  modalTime: { fontSize: 12, color: "#94A3B8", marginTop: 16 },
  modalLinkBtn: { backgroundColor: "#EEF3FF", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 12 },
  modalLinkText: { color: "#1B4FD8", fontWeight: "700" },
  modalBtn: { backgroundColor: "#1B4FD8", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 12 },
  modalBtnText: { color: "#fff", fontWeight: "700" },
});
