import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  StatusBar, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatarBRL } from "../../../lib/api";
import {
  obrasApi, creditoApi, usuariosApi, notificacoesApi,
  type Obra, type Credito, type UsuarioPerfil,
} from "../../../lib/api";

const C = {
  blue:     "#1B4FD8",
  blueMid:  "#2563EB",
  bluePale: "#EEF3FF",
  mint:     "#22C55E",
  mintBt:   "#4ADE80",
  mintPale: "#DCFCE7",
  navy:     "#0C1A3D",
  ink:      "#0F172A",
  inkSoft:  "#1E293B",
  gray:     "#64748B",
  grayL:    "#94A3B8",
  surface:  "#F8FAFC",
  border:   "#E2E8F0",
  white:    "#FFFFFF",
  red:      "#EF4444",
};

const STATUS_LABEL: Record<string, string> = {
  PLANEJAMENTO: "Planejamento",
  EM_ANDAMENTO: "Em andamento",
  PAUSADA:      "Pausada",
  CONCLUIDA:    "Concluída",
  CANCELADA:    "Cancelada",
};

const QUICK_ACTIONS = [
  { icon: "camera-outline"        as const, label: "Registrar",  route: null        },
  { icon: "calculator-outline"    as const, label: "Simular",    route: "/(tabs)/credito/index"      },
  { icon: "document-text-outline" as const, label: "Documentos", route: "/(tabs)/perfil/index"       },
  { icon: "notifications-outline" as const, label: "Avisos",     route: "/(tabs)/notificacoes/index" },
];

export default function HomeScreen() {
  const router = useRouter();
  const [obras,   setObras]   = useState<Obra[]>([]);
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [unread,  setUnread]  = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ocultarSaldo, setOcultarSaldo] = useState(false);

  const carregar = useCallback(async () => {
    const [obrasR, creditosR, usuarioR, unreadR] = await Promise.allSettled([
      obrasApi.listar(),
      creditoApi.meus(),
      usuariosApi.obterPerfil(),
      notificacoesApi.contarNaoLidas(),
    ]);
    if (obrasR.status   === "fulfilled") setObras(obrasR.value);
    if (creditosR.status === "fulfilled") setCreditos(creditosR.value);
    if (usuarioR.status  === "fulfilled") setUsuario(usuarioR.value);
    if (unreadR.status   === "fulfilled") setUnread(unreadR.value.count);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const primeiroNome  = usuario?.nome?.split(" ")[0] ?? "...";
  const inicial       = usuario?.nome?.charAt(0).toUpperCase() ?? "I";
  const creditoAtivo  = creditos.find((c) => c.status === "ATIVO") ?? creditos[0];
  const obraDestaque  = obras[0];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={C.white} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.blue} />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => router.push("/(tabs)/perfil/index")}
          activeOpacity={0.75}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{inicial}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Olá, {primeiroNome}</Text>
            <Text style={styles.greetingSub}>
              {usuario?.kycStatus === "APROVADO" ? "✓ KYC verificado" : "KYC pendente"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => router.push("/(tabs)/notificacoes/index")}
          activeOpacity={0.75}
        >
          <Ionicons name="notifications-outline" size={22} color={C.white} />
          {unread > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unread > 9 ? "9+" : unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); carregar(); }}
            tintColor={C.blue}
          />
        }
      >
        {/* ── CARD PRINCIPAL (crédito ou boas-vindas) ── */}
        <View style={styles.cardBlock}>
          {creditoAtivo ? (
            <>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardSmallLabel}>Crédito aprovado</Text>
                <TouchableOpacity onPress={() => setOcultarSaldo((v) => !v)}>
                  <Ionicons
                    name={ocultarSaldo ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="rgba(255,255,255,0.65)"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.cardValue}>
                {ocultarSaldo ? "R$ ●●●●●●" : formatarBRL(creditoAtivo.valorAprovado)}
              </Text>

              <View style={styles.cardDivider} />

              <View style={styles.cardStats}>
                <StatItem
                  label="Liberado"
                  value={ocultarSaldo ? "●●●●" : formatarBRL(creditoAtivo.valorLiberado)}
                />
                <StatItem
                  label="Disponível"
                  value={ocultarSaldo ? "●●●●" : formatarBRL(creditoAtivo.valorAprovado - creditoAtivo.valorLiberado)}
                  highlight
                />
                <StatItem label="Taxa" value={`${creditoAtivo.taxaMensal}% a.m.`} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.cardSmallLabel}>Bem-vindo à IMOBI</Text>
              <Text style={[styles.cardValue, { fontSize: 22, lineHeight: 30 }]}>
                Capital para{"\n"}sua obra.
              </Text>
              <TouchableOpacity
                style={styles.cardCta}
                onPress={() => router.push("/(tabs)/credito/index")}
              >
                <Text style={styles.cardCtaText}>Simular crédito →</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── AÇÕES RÁPIDAS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações rápidas</Text>
          <View style={styles.quickRow}>
            {QUICK_ACTIONS.map(({ icon, label, route }) => (
              <TouchableOpacity
                key={label}
                style={styles.quickItem}
                activeOpacity={0.7}
                onPress={() => {
                  if (label === "Registrar" && obraDestaque) {
                    router.push(`/(tabs)/obras/${obraDestaque.obraId}`);
                  } else if (route) {
                    router.push(route as any);
                  }
                }}
              >
                <View style={styles.quickIcon}>
                  <Ionicons name={icon} size={24} color={C.blue} />
                </View>
                <Text style={styles.quickLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── MINHAS OBRAS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Minhas obras</Text>

          {obras.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="business-outline" size={42} color={C.border} />
              <Text style={styles.emptyTitle}>Nenhuma obra cadastrada</Text>
              <Text style={styles.emptySub}>
                Solicite crédito e registre sua primeira obra
              </Text>
            </View>
          ) : (
            obras.map((obra) => {
              const etapas    = obra.etapas ?? [];
              const concluidas = etapas.filter((e) => e.status === "CONCLUIDA").length;
              const progresso  = etapas.length ? Math.round((concluidas / etapas.length) * 100) : 0;

              return (
                <TouchableOpacity
                  key={obra.obraId}
                  style={styles.obraCard}
                  onPress={() => router.push(`/(tabs)/obras/${obra.obraId}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.obraCardTop}>
                    <View style={styles.obraIconWrap}>
                      <Ionicons name="business-outline" size={20} color={C.blue} />
                    </View>
                    <View style={styles.obraInfo}>
                      <Text style={styles.obraNome} numberOfLines={1}>{obra.nome}</Text>
                      <Text style={styles.obraEnd}  numberOfLines={1}>{obra.endereco}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={C.grayL} />
                  </View>

                  <View style={styles.obraProgress}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progresso}%` as any }]} />
                    </View>
                    <Text style={styles.progressPct}>{progresso}%</Text>
                  </View>

                  <View style={styles.obraBottom}>
                    <View style={styles.statusChip}>
                      <Text style={styles.statusChipText}>
                        {STATUS_LABEL[obra.status] ?? obra.status}
                      </Text>
                    </View>
                    {etapas.length > 0 && (
                      <Text style={styles.obraEtapasMeta}>
                        {concluidas}/{etapas.length} etapas
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function StatItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: "500" }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "700", color: highlight ? C.mintBt : C.white }}>
        {value}
      </Text>
    </View>
  );
}

const C_mintBt = "#4ADE80";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  loadingContainer: { flex: 1, backgroundColor: C.blue, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    backgroundColor: C.blue,
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingBottom: 0,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  avatarText:  { fontSize: 18, fontWeight: "800", color: C.white },
  greeting:    { fontSize: 16, fontWeight: "700", color: C.white },
  greetingSub: { fontSize: 11, color: "rgba(255,255,255,0.60)", marginTop: 1 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center", alignItems: "center",
  },
  bellBadge: {
    position: "absolute", top: 3, right: 3,
    backgroundColor: C.red, borderRadius: 9,
    minWidth: 16, height: 16,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: C.blue,
  },
  bellBadgeText: { fontSize: 9, fontWeight: "800", color: C.white },

  // Credit card block (extends header bg)
  cardBlock: {
    backgroundColor: C.blue,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  cardTopRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardSmallLabel: { fontSize: 12, color: "rgba(255,255,255,0.60)", fontWeight: "500", letterSpacing: 0.3 },
  cardValue:      { fontSize: 30, fontWeight: "800", color: C.white, letterSpacing: -0.5, marginBottom: 18 },
  cardDivider:    { height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginBottom: 16 },
  cardStats:      { flexDirection: "row", justifyContent: "space-between" },
  cardCta: {
    marginTop: 16, backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18,
    alignSelf: "flex-start",
  },
  cardCtaText: { color: C.white, fontWeight: "700", fontSize: 14 },

  // Sections
  section:      { paddingHorizontal: 20, paddingTop: 28 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: C.ink, marginBottom: 16 },

  // Quick actions
  quickRow: { flexDirection: "row", justifyContent: "space-between" },
  quickItem: { alignItems: "center", gap: 8, flex: 1 },
  quickIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: C.white,
    justifyContent: "center", alignItems: "center",
    shadowColor: C.ink, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: C.border,
  },
  quickLabel: { fontSize: 11, fontWeight: "600", color: C.gray },

  // Obra cards
  obraCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    marginBottom: 12, shadowColor: C.ink,
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  obraCardTop:  { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  obraIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.bluePale, justifyContent: "center", alignItems: "center" },
  obraInfo:     { flex: 1 },
  obraNome:     { fontSize: 15, fontWeight: "700", color: C.ink },
  obraEnd:      { fontSize: 12, color: C.gray, marginTop: 2 },
  obraProgress: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  progressTrack: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: "hidden" },
  progressFill:  { height: "100%" as any, backgroundColor: C.mint, borderRadius: 3 },
  progressPct:   { fontSize: 13, fontWeight: "700", color: C.blue, width: 36, textAlign: "right" },
  obraBottom:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusChip:    { backgroundColor: C.bluePale, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusChipText:{ fontSize: 11, fontWeight: "600", color: C.blue },
  obraEtapasMeta:{ fontSize: 12, color: C.grayL },

  // Empty
  emptyCard:  { backgroundColor: C.white, borderRadius: 16, padding: 32, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: C.ink, marginTop: 8 },
  emptySub:   { fontSize: 13, color: C.gray, textAlign: "center" },
});
