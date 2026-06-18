import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatarBRL } from "@imbobi/core";
import { parceirosApi, type OperacaoIndicada, type ParceiroResumo } from "../../../lib/api";
import { useMobileTabAccess } from "../../../lib/rbac";

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  INDICADA: { label: "Indicada", color: "#92400e", bg: "#fef3c7", icon: "megaphone" },
  EM_ANALISE: { label: "Em analise", color: "#1d4ed8", bg: "#dbeafe", icon: "search" },
  APROVADA: { label: "Aprovada", color: "#166534", bg: "#dcfce7", icon: "checkmark-circle" },
  EM_OBRA: { label: "Em obra", color: "#0f766e", bg: "#ccfbf1", icon: "business" },
  CONCLUIDA: { label: "Concluida", color: "#166534", bg: "#dcfce7", icon: "trophy" },
  RECUSADA: { label: "Recusada", color: "#991b1b", bg: "#fee2e2", icon: "close-circle" },
};

const EMPTY_RESUMO: ParceiroResumo = {
  comissoesAReceber: 0,
  comissoesPagasMes: 0,
  comissoesPagasTotal: 0,
  operacoesAtivas: 0,
  taxaAprovacao: 0,
  codigoIndicacao: "PARC-IMOBI",
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export default function ComercialHomeScreen() {
  const { loadingRole, canAccess } = useMobileTabAccess("comercial");
  const [resumo, setResumo] = useState<ParceiroResumo>(EMPTY_RESUMO);
  const [operacoes, setOperacoes] = useState<OperacaoIndicada[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const funil = useMemo(() => {
    const indicadas = operacoes.filter((op) => op.status === "INDICADA").length;
    const emAnalise = operacoes.filter((op) => op.status === "EM_ANALISE").length;
    const aprovadas = operacoes.filter((op) => op.status === "APROVADA" || op.status === "CONCLUIDA").length;
    return { indicadas, emAnalise, aprovadas };
  }, [operacoes]);

  const carregar = async () => {
    try {
      const [resumoData, operacoesData] = await Promise.all([
        parceirosApi.resumo(),
        parceirosApi.operacoes(),
      ]);
      setResumo(resumoData);
      setOperacoes(operacoesData);
      setError(null);
    } catch (e: unknown) {
      setResumo(EMPTY_RESUMO);
      setOperacoes([]);
      setError(errorMessage(e, "Nao foi possivel carregar o painel comercial."));
    }
  };

  useEffect(() => {
    if (loadingRole) return;
    if (!canAccess) {
      setLoading(false);
      return;
    }
    carregar().finally(() => setLoading(false));
  }, [loadingRole, canAccess]);

  if (loadingRole || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  if (!canAccess) {
    return (
      <View style={styles.center}>
        <Text style={styles.accessTitle}>Modulo comercial restrito</Text>
        <Text style={styles.accessText}>Este perfil nao possui permissao para acompanhar indicacoes.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={operacoes}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#F59E0B"
            onRefresh={async () => {
              setRefreshing(true);
              await carregar();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={14} color="#FCD34D" />
                <Text style={styles.badgeText}>Mesa comercial</Text>
              </View>

              <Text style={styles.title}>Pipeline parceiro</Text>
              <Text style={styles.subtitle}>
                Acompanhe indicacoes, codigo comercial e operacoes ativas sem expor dados sensiveis do cliente.
              </Text>

              <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>Codigo de indicacao</Text>
                <Text style={styles.codeValue}>{resumo.codigoIndicacao}</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <StatCard label="Ativas" value={String(resumo.operacoesAtivas)} tone="amber" />
              <StatCard label="Aprovacao" value={`${resumo.taxaAprovacao}%`} tone="green" />
              <StatCard label="A receber" value={formatarBRL(resumo.comissoesAReceber)} tone="blue" />
              <StatCard label="Pagas mes" value={formatarBRL(resumo.comissoesPagasMes)} tone="slate" />
            </View>

            <View style={styles.funnelCard}>
              <Text style={styles.sectionTitle}>Funil rapido</Text>
              <View style={styles.funnelRow}>
                <FunnelStep label="Indicadas" value={funil.indicadas} color="#F59E0B" />
                <FunnelStep label="Analise" value={funil.emAnalise} color="#3B82F6" />
                <FunnelStep label="Aprovadas" value={funil.aprovadas} color="#22C55E" />
              </View>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="warning" size={16} color="#b45309" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.listTitle}>Operacoes recentes</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="briefcase" size={32} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Nenhuma indicacao ainda</Text>
            <Text style={styles.emptyText}>
              As operacoes indicadas pelo comercial/parceiro aparecem aqui com status e comissao.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status] ?? {
            label: item.status,
            color: "#334155",
            bg: "#e2e8f0",
            icon: "ellipse" as const,
          };

          return (
            <View style={styles.operationCard}>
              <View style={styles.operationTop}>
                <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={13} color={meta.color} />
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Text style={styles.dateText}>{formatDate(item.criadoEm)}</Text>
              </View>

              <Text style={styles.clientName}>{item.clienteRef}</Text>
              <Text style={styles.operationCode}>{item.codigo}</Text>

              <View style={styles.operationFooter}>
                <View>
                  <Text style={styles.footerLabel}>Comissao estimada</Text>
                  <Text style={styles.footerValue}>{formatarBRL(item.valorComissao)}</Text>
                </View>
                <View style={styles.commissionPill}>
                  <Text style={styles.commissionText}>{item.percentualComissao}%</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "amber" | "green" | "blue" | "slate";
}) {
  const toneStyle = {
    amber: styles.statAmber,
    green: styles.statGreen,
    blue: styles.statBlue,
    slate: styles.statSlate,
  }[tone];

  return (
    <View style={[styles.statCard, toneStyle]}>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FunnelStep({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.funnelStep}>
      <View style={[styles.funnelDot, { backgroundColor: color }]} />
      <Text style={styles.funnelValue}>{value}</Text>
      <Text style={styles.funnelLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff7ed" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff7ed", padding: 24 },
  accessTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 8 },
  accessText: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 },
  listContent: { paddingBottom: 28 },
  header: {
    backgroundColor: "#3B2207",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(252,211,77,0.35)",
    backgroundColor: "rgba(245,158,11,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 18,
  },
  badgeText: { color: "#fde68a", fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  title: { color: "#fff", fontSize: 30, fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { color: "rgba(255,255,255,0.64)", fontSize: 14, lineHeight: 21, marginTop: 8 },
  codeCard: { marginTop: 20, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  codeLabel: { color: "rgba(255,255,255,0.54)", fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginBottom: 4 },
  codeValue: { color: "#FCD34D", fontSize: 22, fontWeight: "900", letterSpacing: 0.8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, marginTop: 16 },
  statCard: { width: "47.8%", borderRadius: 16, padding: 14, borderWidth: 1, backgroundColor: "#fff" },
  statAmber: { borderColor: "#fed7aa" },
  statGreen: { borderColor: "#bbf7d0" },
  statBlue: { borderColor: "#bfdbfe" },
  statSlate: { borderColor: "#e2e8f0" },
  statValue: { color: "#111827", fontSize: 18, fontWeight: "900" },
  statLabel: { color: "#78716c", fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginTop: 3 },
  funnelCard: { backgroundColor: "#fff", borderRadius: 20, marginHorizontal: 16, marginTop: 14, padding: 16, borderWidth: 1, borderColor: "#ffedd5" },
  sectionTitle: { color: "#111827", fontSize: 15, fontWeight: "900", marginBottom: 14 },
  funnelRow: { flexDirection: "row", justifyContent: "space-between" },
  funnelStep: { alignItems: "center", flex: 1 },
  funnelDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 8 },
  funnelValue: { color: "#111827", fontSize: 20, fontWeight: "900" },
  funnelLabel: { color: "#78716c", fontSize: 11, fontWeight: "700", marginTop: 2 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef3c7", borderRadius: 14, padding: 12, marginHorizontal: 16, marginTop: 14 },
  errorText: { color: "#92400e", fontSize: 13, flex: 1, fontWeight: "600" },
  listTitle: { color: "#111827", fontSize: 17, fontWeight: "900", marginHorizontal: 18, marginTop: 22, marginBottom: 2 },
  emptyCard: { margin: 16, backgroundColor: "#fff", borderRadius: 22, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#ffedd5" },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginTop: 12 },
  emptyText: { color: "#78716c", fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6 },
  operationCard: { backgroundColor: "#fff", borderRadius: 20, marginHorizontal: 16, marginTop: 12, padding: 16, borderWidth: 1, borderColor: "#ffedd5" },
  operationTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "800" },
  dateText: { color: "#78716c", fontSize: 12, fontWeight: "700" },
  clientName: { color: "#111827", fontSize: 18, fontWeight: "900", marginTop: 14 },
  operationCode: { color: "#d97706", fontSize: 12, fontWeight: "900", marginTop: 3 },
  operationFooter: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#ffedd5", paddingTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerLabel: { color: "#78716c", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  footerValue: { color: "#111827", fontSize: 15, fontWeight: "900", marginTop: 2 },
  commissionPill: { backgroundColor: "#fef3c7", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  commissionText: { color: "#92400e", fontSize: 12, fontWeight: "900" },
});
