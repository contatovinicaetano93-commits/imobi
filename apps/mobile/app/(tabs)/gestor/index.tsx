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
import {
  managerApi,
  type EtapaPendenteMobile,
  type KycPendenteMobile,
  type ManagerStats,
} from "../../../lib/api";
import { useMobileTabAccess } from "../../../lib/rbac";

const ZERO_STATS: ManagerStats = {
  filaAprovacoes: 0,
  filaKyc: 0,
  creditosAtivos: 0,
  obrasAtivas: 0,
};

type QueueItem =
  | { kind: "ETAPA"; id: string; etapa: EtapaPendenteMobile }
  | { kind: "KYC"; id: string; kyc: KycPendenteMobile };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function hoursSince(value: string): number {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60)));
}

function maskCpf(cpf?: string): string {
  if (!cpf) return "CPF nao informado";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return "CPF protegido";
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
}

export default function GestorHomeScreen() {
  const { loadingRole, canAccess } = useMobileTabAccess("gestor");
  const [stats, setStats] = useState<ManagerStats>(ZERO_STATS);
  const [etapas, setEtapas] = useState<EtapaPendenteMobile[]>([]);
  const [kyc, setKyc] = useState<KycPendenteMobile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queue = useMemo<QueueItem[]>(() => {
    const etapaItems = etapas.map((etapa) => ({ kind: "ETAPA" as const, id: `etapa-${etapa.etapaId}`, etapa }));
    const kycItems = kyc.map((doc) => ({ kind: "KYC" as const, id: `kyc-${doc.kycDocumentoId}`, kyc: doc }));
    return [...etapaItems, ...kycItems].slice(0, 10);
  }, [etapas, kyc]);

  const totalPendente = stats.filaAprovacoes + stats.filaKyc;
  const critical = stats.filaAprovacoes > 10 || stats.filaKyc > 10;

  const carregar = async () => {
    try {
      const [statsData, etapasData, kycData] = await Promise.all([
        managerApi.dashboard(),
        managerApi.etapasPendentes(5),
        managerApi.kycPendentes(5),
      ]);
      setStats(statsData);
      setEtapas(etapasData.etapas);
      setKyc(kycData.documentos);
      setError(null);
    } catch (e: unknown) {
      setStats(ZERO_STATS);
      setEtapas([]);
      setKyc([]);
      setError(errorMessage(e, "Nao foi possivel carregar a fila do gestor."));
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
        <ActivityIndicator size="large" color="#A78BFA" />
      </View>
    );
  }

  if (!canAccess) {
    return (
      <View style={styles.center}>
        <Text style={styles.accessTitle}>Modulo do gestor restrito</Text>
        <Text style={styles.accessText}>Este perfil nao possui permissao para acompanhar aprovacoes do fundo.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#A78BFA"
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
                <Ionicons name="shield-checkmark" size={14} color="#C4B5FD" />
                <Text style={styles.badgeText}>Gestor do Fundo</Text>
              </View>

              <Text style={styles.title}>Fila de aprovacao</Text>
              <Text style={styles.subtitle}>
                {totalPendente} {totalPendente === 1 ? "item pendente" : "itens pendentes"} para decisao operacional.
              </Text>

              {critical && (
                <View style={styles.criticalBox}>
                  <Ionicons name="alert-circle" size={16} color="#FCA5A5" />
                  <Text style={styles.criticalText}>Fila critica: priorize etapas e KYC com maior antiguidade.</Text>
                </View>
              )}
            </View>

            <View style={styles.statsGrid}>
              <StatCard label="Etapas" value={stats.filaAprovacoes} tone={stats.filaAprovacoes > 10 ? "red" : "violet"} />
              <StatCard label="KYC" value={stats.filaKyc} tone={stats.filaKyc > 10 ? "red" : "amber"} />
              <StatCard label="Creditos" value={stats.creditosAtivos} tone="green" />
              <StatCard label="Obras" value={stats.obrasAtivas} tone="blue" />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="warning" size={16} color="#7c2d12" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.listTitle}>Fila resumida</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle" size={34} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Nada pendente agora</Text>
            <Text style={styles.emptyText}>Quando etapas ou documentos entrarem para analise, eles aparecem aqui.</Text>
          </View>
        }
        renderItem={({ item }) =>
          item.kind === "ETAPA" ? (
            <EtapaCard etapa={item.etapa} />
          ) : (
            <KycCard kyc={item.kyc} />
          )
        }
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
  tone: "violet" | "amber" | "green" | "blue" | "red";
}) {
  const toneStyle = {
    violet: styles.statViolet,
    amber: styles.statAmber,
    green: styles.statGreen,
    blue: styles.statBlue,
    red: styles.statRed,
  }[tone];

  return (
    <View style={[styles.statCard, toneStyle]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EtapaCard({ etapa }: { etapa: EtapaPendenteMobile }) {
  const age = hoursSince(etapa.criadoEm);
  const urgent = age >= 24;

  return (
    <View style={styles.queueCard}>
      <View style={styles.queueTop}>
        <View style={[styles.typePill, urgent ? styles.typePillUrgent : styles.typePillEtapa]}>
          <Ionicons name={urgent ? "alert-circle" : "construct"} size={13} color={urgent ? "#991b1b" : "#6d28d9"} />
          <Text style={[styles.typeText, urgent ? styles.typeTextUrgent : styles.typeTextEtapa]}>
            {urgent ? "Etapa urgente" : "Etapa"}
          </Text>
        </View>
        <Text style={styles.ageText}>{age}h</Text>
      </View>

      <Text style={styles.queueTitle} numberOfLines={1}>{etapa.obra.nome}</Text>
      <Text style={styles.queueSubtitle} numberOfLines={1}>{etapa.nome}</Text>
      <Text style={styles.queueMeta} numberOfLines={1}>{etapa.obra.usuario?.nome ?? "Tomador nao informado"} · {maskCpf(etapa.obra.usuario?.cpf)}</Text>

      <View style={styles.queueFooter}>
        <Text style={styles.footerLabel}>{etapa.evidenciasCount} evidencias validadas</Text>
        <Text style={styles.footerValue}>{formatarBRL(Number(etapa.valorLiberacao))}</Text>
      </View>
    </View>
  );
}

function KycCard({ kyc }: { kyc: KycPendenteMobile }) {
  const age = hoursSince(kyc.criadoEm);

  return (
    <View style={styles.queueCard}>
      <View style={styles.queueTop}>
        <View style={styles.typePillKyc}>
          <Ionicons name="document-text" size={13} color="#92400e" />
          <Text style={styles.typeTextKyc}>KYC</Text>
        </View>
        <Text style={styles.ageText}>{age}h</Text>
      </View>

      <Text style={styles.queueTitle} numberOfLines={1}>{kyc.usuario?.nome ?? "Usuario sem nome"}</Text>
      <Text style={styles.queueSubtitle} numberOfLines={1}>{kyc.tipo}</Text>
      <Text style={styles.queueMeta} numberOfLines={1}>{maskCpf(kyc.usuario?.cpf)} · {kyc.status}</Text>

      <View style={styles.queueFooter}>
        <Text style={styles.footerLabel}>Documento pendente</Text>
        <Text style={styles.footerValue}>Revisar</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f3ff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f3ff", padding: 24 },
  accessTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 8 },
  accessText: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 },
  listContent: { paddingBottom: 28 },
  header: {
    backgroundColor: "#3b0764",
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
    borderColor: "rgba(196,181,253,0.35)",
    backgroundColor: "rgba(167,139,250,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 18,
  },
  badgeText: { color: "#ddd6fe", fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  title: { color: "#fff", fontSize: 30, fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { color: "rgba(255,255,255,0.64)", fontSize: 14, lineHeight: 21, marginTop: 8 },
  criticalBox: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, backgroundColor: "rgba(239,68,68,0.18)", borderWidth: 1, borderColor: "rgba(248,113,113,0.28)", borderRadius: 14, padding: 12 },
  criticalText: { color: "#fecaca", fontSize: 12, fontWeight: "700", flex: 1, lineHeight: 17 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, marginTop: 16 },
  statCard: { width: "47.8%", borderRadius: 16, padding: 14, borderWidth: 1, backgroundColor: "#fff" },
  statViolet: { borderColor: "#ddd6fe" },
  statAmber: { borderColor: "#fde68a" },
  statGreen: { borderColor: "#bbf7d0" },
  statBlue: { borderColor: "#bfdbfe" },
  statRed: { borderColor: "#fecaca" },
  statValue: { color: "#111827", fontSize: 24, fontWeight: "900" },
  statLabel: { color: "#6b7280", fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginTop: 3 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ffedd5", borderRadius: 14, padding: 12, marginHorizontal: 16, marginTop: 14 },
  errorText: { color: "#7c2d12", fontSize: 13, flex: 1, fontWeight: "600" },
  listTitle: { color: "#111827", fontSize: 17, fontWeight: "900", marginHorizontal: 18, marginTop: 22, marginBottom: 2 },
  emptyCard: { margin: 16, backgroundColor: "#fff", borderRadius: 22, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#ede9fe" },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginTop: 12 },
  emptyText: { color: "#6b7280", fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6 },
  queueCard: { backgroundColor: "#fff", borderRadius: 20, marginHorizontal: 16, marginTop: 12, padding: 16, borderWidth: 1, borderColor: "#ede9fe" },
  queueTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  typePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  typePillEtapa: { backgroundColor: "#ede9fe" },
  typePillUrgent: { backgroundColor: "#fee2e2" },
  typePillKyc: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: "#fef3c7" },
  typeText: { fontSize: 11, fontWeight: "800" },
  typeTextEtapa: { color: "#6d28d9" },
  typeTextUrgent: { color: "#991b1b" },
  typeTextKyc: { color: "#92400e", fontSize: 11, fontWeight: "800" },
  ageText: { color: "#6b7280", fontSize: 12, fontWeight: "800" },
  queueTitle: { color: "#111827", fontSize: 17, fontWeight: "900", marginTop: 14 },
  queueSubtitle: { color: "#7c3aed", fontSize: 13, fontWeight: "800", marginTop: 4 },
  queueMeta: { color: "#6b7280", fontSize: 12, fontWeight: "600", marginTop: 8 },
  queueFooter: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerLabel: { color: "#6b7280", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  footerValue: { color: "#111827", fontSize: 13, fontWeight: "900" },
});
