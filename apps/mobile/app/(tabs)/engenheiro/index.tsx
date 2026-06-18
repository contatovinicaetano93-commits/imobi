import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { engenheirosApi, type VisitaEngenheiro } from "../../../lib/api";
import { useMobileTabAccess } from "../../../lib/rbac";

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  AGENDADA: { label: "Aguardando vistoria", color: "#92400e", bg: "#fef3c7", icon: "time" },
  INICIADA: { label: "Em campo", color: "#1d4ed8", bg: "#dbeafe", icon: "navigate" },
  CONCLUIDA: { label: "Concluida", color: "#166534", bg: "#dcfce7", icon: "checkmark-circle" },
  REPROVADA: { label: "Reprovada", color: "#991b1b", bg: "#fee2e2", icon: "alert-circle" },
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data a confirmar";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function EngenheiroHomeScreen() {
  const router = useRouter();
  const { loadingRole, canAccess } = useMobileTabAccess("engenharia");
  const [visitas, setVisitas] = useState<VisitaEngenheiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const agendadas = visitas.filter((v) => v.status === "AGENDADA").length;
    const iniciadas = visitas.filter((v) => v.status === "INICIADA").length;
    const concluidas = visitas.filter((v) => v.status === "CONCLUIDA").length;
    return { agendadas, iniciadas, concluidas, total: visitas.length };
  }, [visitas]);

  const carregar = async () => {
    try {
      const data = await engenheirosApi.visitas();
      setVisitas(data);
      setError(null);
    } catch (e: unknown) {
      setError(errorMessage(e, "Nao foi possivel carregar suas vistorias."));
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
        <ActivityIndicator size="large" color="#4ADE80" />
      </View>
    );
  }

  if (!canAccess) {
    return (
      <View style={styles.center}>
        <Text style={styles.accessTitle}>Modulo de engenharia restrito</Text>
        <Text style={styles.accessText}>Este perfil nao possui permissao para acompanhar vistorias.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={visitas}
        keyExtractor={(item) => item.visitaId}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#4ADE80"
            onRefresh={async () => {
              setRefreshing(true);
              await carregar();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={14} color="#4ADE80" />
              <Text style={styles.badgeText}>Prancheta de campo</Text>
            </View>

            <Text style={styles.title}>Fila de vistorias</Text>
            <Text style={styles.subtitle}>
              Priorize etapas aguardando validacao e abra a obra antes de ir para campo.
            </Text>

            <View style={styles.statsGrid}>
              <StatCard label="Total" value={stats.total} tone="neutral" />
              <StatCard label="Aguardando" value={stats.agendadas} tone="warning" />
              <StatCard label="Em campo" value={stats.iniciadas} tone="info" />
              <StatCard label="Concluidas" value={stats.concluidas} tone="success" />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="warning" size={16} color="#b91c1c" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="file-tray" size={32} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Nenhuma vistoria na fila</Text>
            <Text style={styles.emptyText}>
              Quando uma etapa entrar em vistoria, ela aparece aqui com endereco e status.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = STATUS_META[item.status] ?? {
            label: item.status,
            color: "#334155",
            bg: "#e2e8f0",
            icon: "ellipse" as const,
          };

          return (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.visitCard}
              onPress={() => router.push(`/(tabs)/obras/${item.obraId}`)}
            >
              <View style={styles.visitAccent} />

              <View style={styles.visitBody}>
                <View style={styles.visitTopRow}>
                  <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                    <Ionicons name={status.icon} size={13} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(item.dataAgendada)}</Text>
                </View>

                <Text style={styles.obraName} numberOfLines={1}>
                  {item.obraNome}
                </Text>
                <Text style={styles.etapaName} numberOfLines={1}>
                  {item.etapaNome}
                </Text>

                <View style={styles.addressRow}>
                  <Ionicons name="location" size={14} color="#64748b" />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {item.obra?.endereco ?? "Endereco nao informado"}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.footerText}>Abrir obra</Text>
                  <Ionicons name="arrow-forward" size={16} color="#0C1A3D" />
                </View>
              </View>
            </TouchableOpacity>
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
  value: number;
  tone: "neutral" | "warning" | "info" | "success";
}) {
  const toneStyle = {
    neutral: styles.statNeutral,
    warning: styles.statWarning,
    info: styles.statInfo,
    success: styles.statSuccess,
  }[tone];

  return (
    <View style={[styles.statCard, toneStyle]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#eef2f7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#eef2f7", padding: 24 },
  accessTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  accessText: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20 },
  listContent: { paddingBottom: 28 },
  header: {
    backgroundColor: "#0C1A3D",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.35)",
    backgroundColor: "rgba(74,222,128,0.09)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 18,
  },
  badgeText: { color: "#bbf7d0", fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  title: { color: "#fff", fontSize: 30, fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { color: "rgba(255,255,255,0.62)", fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 320 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22 },
  statCard: { width: "47.8%", borderRadius: 16, padding: 14, borderWidth: 1 },
  statNeutral: { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" },
  statWarning: { backgroundColor: "rgba(251,191,36,0.14)", borderColor: "rgba(251,191,36,0.28)" },
  statInfo: { backgroundColor: "rgba(96,165,250,0.14)", borderColor: "rgba(96,165,250,0.28)" },
  statSuccess: { backgroundColor: "rgba(74,222,128,0.14)", borderColor: "rgba(74,222,128,0.28)" },
  statValue: { color: "#fff", fontSize: 24, fontWeight: "900" },
  statLabel: { color: "rgba(255,255,255,0.58)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginTop: 3 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
  },
  errorText: { color: "#991b1b", fontSize: 13, flex: 1, fontWeight: "600" },
  emptyCard: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginTop: 12 },
  emptyText: { color: "#64748b", fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6 },
  visitCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 22,
    overflow: "hidden",
    flexDirection: "row",
    shadowColor: "#0f172a",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  visitAccent: { width: 6, backgroundColor: "#4ADE80" },
  visitBody: { flex: 1, padding: 16 },
  visitTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "800" },
  dateText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  obraName: { color: "#0f172a", fontSize: 17, fontWeight: "900", marginTop: 14 },
  etapaName: { color: "#16a34a", fontSize: 13, fontWeight: "800", marginTop: 4 },
  addressRow: { flexDirection: "row", gap: 6, marginTop: 12, alignItems: "flex-start" },
  addressText: { color: "#64748b", fontSize: 13, lineHeight: 18, flex: 1 },
  cardFooter: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: { color: "#0C1A3D", fontSize: 13, fontWeight: "900" },
});
