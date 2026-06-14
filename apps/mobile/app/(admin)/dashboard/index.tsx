import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi, type AdminOverview } from "../../../lib/api";

function brl(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function KpiCard({ label, value, sub, alerta, onPress }: { label: string; value: string; sub?: string; alerta?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity style={[s.kpi, alerta && s.kpiAlerta]} onPress={onPress} disabled={!onPress} activeOpacity={0.8}>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {sub && <Text style={s.kpiSub}>{sub}</Text>}
      {alerta && <View style={s.kpiDot} />}
    </TouchableOpacity>
  );
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [ov, setOv] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await adminApi.overview();
      setOv(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); }, []);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#7c3aed" /></View>;

  const pctLiberado = ov && ov.creditoAprovado > 0
    ? Math.round((ov.creditoLiberado / ov.creditoAprovado) * 100)
    : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} tintColor="#7c3aed" />}
    >
      <View style={s.header}>
        <Text style={s.titulo}>Dashboard</Text>
        <Text style={s.sub}>Visão operacional</Text>
      </View>

      {ov && (
        <>
          {/* Carteira */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Carteira de crédito</Text>
            <View style={s.kpiRow}>
              <KpiCard label="Aprovado" value={brl(ov.creditoAprovado)} />
              <KpiCard label="Liberado" value={brl(ov.creditoLiberado)} sub={`${pctLiberado}% do total`} />
            </View>
          </View>

          {/* Obras */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Obras</Text>
            <View style={s.kpiRow}>
              <KpiCard label="Em execução" value={String(ov.obrasAtivas)} />
              <KpiCard label="Total" value={String(ov.obrasTotal)} />
            </View>
          </View>

          {/* Filas — clicáveis */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Filas de ação</Text>
            <View style={s.kpiRow}>
              <KpiCard
                label="Validações pendentes"
                value={String(ov.etapasPendentes)}
                alerta={ov.etapasPendentes > 0}
                onPress={() => router.push("/(admin)/etapas" as any)}
              />
              <KpiCard label="KYC pendente" value={String(ov.kycPendentes)} alerta={ov.kycPendentes > 0} />
            </View>
            <View style={s.kpiRow}>
              <KpiCard label="Fila de liberação" value={String(ov.filaLiberacao)} />
              <KpiCard label="Usuários" value={String(ov.totalUsuarios)} />
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  titulo: { fontSize: 22, fontWeight: "700", color: "#1e3a5f" },
  sub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  section: { padding: 16, paddingBottom: 0 },
  sectionLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpi: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#f3f4f6" },
  kpiAlerta: { borderColor: "#7c3aed", borderWidth: 1.5 },
  kpiValue: { fontSize: 22, fontWeight: "700", color: "#1e3a5f" },
  kpiLabel: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  kpiSub: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  kpiDot: { position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: "#7c3aed" },
});
