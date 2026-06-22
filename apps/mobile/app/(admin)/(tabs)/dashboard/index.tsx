import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../../components/ScreenHeader";
import { adminApi, type AdminOverview } from "../../../../lib/api-roles";
import { formatTaxaSimulacao, formatTaxaFaixaAprovacao, MSG_TAXA_SIMULACAO } from "../../../../lib/tax-config";

const C = { red: "#DC2626", ink: "#0F172A", gray: "#64748B", surface: "#0F172A" };

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await adminApi.overview());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar painel");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  if (loading && !data) {
    return <View style={styles.center}><ActivityIndicator color={C.red} size="large" /></View>;
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Sem dados do painel"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const d = data;
  const alertas = [
    { n: d.kycPendentes, label: "KYC aguardando", route: "/(admin)/(tabs)/aprovacoes", icon: "document-text" as const },
    { n: d.etapasPendentes, label: "Etapas p/ vistoria", route: "/(admin)/(tabs)/aprovacoes", icon: "camera" as const },
    { n: d.filaLiberacao, label: "Liberações", route: "/(admin)/(tabs)/comite", icon: "cash" as const },
  ].filter((a) => a.n > 0);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Centro de comando" subtitle="Administrador IMOBI" dark accent={C.red} />
      <ScrollView contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.red} />}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Ionicons name="shield" size={32} color="#FCA5A5" />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Painel administrativo</Text>
              <Text style={styles.heroSub}>Voto no comitê · pode reduzir a taxa simulada</Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <HeroStat label="Usuários" value={String(d.totalUsuarios)} />
            <HeroStat label="Obras" value={String(d.obrasAtivas)} />
            <HeroStat label="Visitas" value={String(d.visitasAgendadas)} />
          </View>
        </View>

        {alertas.length > 0 && (
          <View style={styles.alertSection}>
            <Text style={styles.sectionLabel}>AÇÕES URGENTES</Text>
            {alertas.map((a) => (
              <TouchableOpacity key={a.label} style={styles.alertRow} onPress={() => router.push(a.route as never)}>
                <View style={styles.alertBadge}><Text style={styles.alertBadgeText}>{a.n}</Text></View>
                <Ionicons name={a.icon} size={18} color={C.red} />
                <Text style={styles.alertLabel}>{a.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.gray} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Ionicons name="lock-closed" size={20} color={C.red} />
            <Text style={styles.policyTitle}>Política de juros</Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={styles.policyLabel}>Simulação (trava fixa)</Text>
            <Text style={styles.policyValMax}>{formatTaxaSimulacao()}</Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={styles.policyLabel}>Faixa de aprovação</Text>
            <Text style={styles.policyVal}>{formatTaxaFaixaAprovacao()}</Text>
          </View>
          <Text style={styles.policyHint}>{MSG_TAXA_SIMULACAO}</Text>
          <TouchableOpacity style={styles.policyCta} onPress={() => router.push("/(admin)/(tabs)/comite")}>
            <Ionicons name="arrow-down-circle" size={18} color={C.red} />
            <Text style={styles.policyCtaText}>Definir taxa final no comitê</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.creditStrip}>
          <Text style={styles.creditLabel}>Crédito na plataforma</Text>
          <View style={styles.creditRow}>
            <View><Text style={styles.creditVal}>R$ {(d.creditoAprovado ?? 0).toLocaleString("pt-BR")}</Text><Text style={styles.creditSub}>Aprovado</Text></View>
            <View style={styles.creditDivider} />
            <View><Text style={styles.creditVal}>R$ {(d.creditoLiberado ?? 0).toLocaleString("pt-BR")}</Text><Text style={styles.creditSub}>Liberado</Text></View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatVal}>{value}</Text>
      <Text style={styles.heroStatLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { color: C.gray, textAlign: "center", marginBottom: 16 },
  retryBtn: { backgroundColor: C.red, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  retryText: { color: "#FFF", fontWeight: "700" },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  hero: { backgroundColor: C.surface, borderRadius: 20, padding: 20, gap: 16 },
  heroTop: { flexDirection: "row", gap: 14, alignItems: "center" },
  heroTitle: { fontSize: 18, fontWeight: "800", color: "#F8FAFC" },
  heroSub: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  heroStats: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 14 },
  heroStat: { alignItems: "center", flex: 1 },
  heroStatVal: { fontSize: 22, fontWeight: "800", color: "#FCA5A5" },
  heroStatLbl: { fontSize: 10, color: "#94A3B8", marginTop: 2 },
  alertSection: { gap: 8 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, color: C.gray },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF", padding: 14, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: C.red },
  alertBadge: { backgroundColor: "#FEE2E2", minWidth: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  alertBadgeText: { fontSize: 13, fontWeight: "800", color: C.red },
  alertLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: C.ink },
  policyCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 18, gap: 12, borderWidth: 1, borderColor: "#FECACA" },
  policyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  policyTitle: { fontSize: 15, fontWeight: "700", color: C.ink },
  policyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  policyLabel: { fontSize: 13, color: C.gray },
  policyValMax: { fontSize: 18, fontWeight: "800", color: C.red },
  policyVal: { fontSize: 14, fontWeight: "700", color: C.ink },
  policyHint: { fontSize: 12, color: C.gray, lineHeight: 18, backgroundColor: "#FEF2F2", padding: 12, borderRadius: 10 },
  policyCta: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderWidth: 1, borderColor: "#FECACA", borderRadius: 10 },
  policyCtaText: { fontSize: 13, fontWeight: "700", color: C.red },
  creditStrip: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, gap: 12 },
  creditLabel: { fontSize: 12, fontWeight: "700", color: C.gray, letterSpacing: 0.5 },
  creditRow: { flexDirection: "row", alignItems: "center" },
  creditVal: { fontSize: 18, fontWeight: "800", color: C.ink },
  creditSub: { fontSize: 11, color: C.gray },
  creditDivider: { width: 1, height: 36, backgroundColor: "#E2E8F0", marginHorizontal: 20 },
});
