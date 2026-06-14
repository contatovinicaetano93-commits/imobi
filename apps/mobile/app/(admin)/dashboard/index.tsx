import { View, Text, ScrollView, StyleSheet, ActivityIndicator, StatusBar, Platform, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { adminApi, type AdminOverview } from "../../../lib/api";

const C = { blue: "#1B4FD8", navy: "#0C1A3D", mint: "#22C55E", amber: "#F59E0B", red: "#EF4444", ink: "#0F172A", gray: "#64748B", surface: "#F8FAFC", border: "#E2E8F0", white: "#FFFFFF" };

function formatarBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.overview()
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pctLiberado = overview && overview.creditoAprovado > 0
    ? Math.round((overview.creditoLiberado / overview.creditoAprovado) * 100)
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 24, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: C.white }}>Dashboard</Text>
        <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>Visão geral da operação</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.surface }}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>

          {/* Carteira */}
          <View style={{ backgroundColor: C.navy, borderRadius: 20, padding: 20 }}>
            <Text style={{ color: "#94A3B8", fontSize: 12, fontWeight: "600", letterSpacing: 0.8 }}>CARTEIRA TOTAL</Text>
            <Text style={{ color: C.white, fontSize: 30, fontWeight: "800", marginTop: 4 }}>
              {formatarBRL(overview?.creditoAprovado ?? 0)}
            </Text>
            <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 3, marginTop: 12, overflow: "hidden" }}>
              <View style={{ height: 6, backgroundColor: C.mint, borderRadius: 3, width: `${pctLiberado}%` as any }} />
            </View>
            <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 6 }}>
              {formatarBRL(overview?.creditoLiberado ?? 0)} liberado · {pctLiberado}%
            </Text>
          </View>

          {/* KPI Grid */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <KpiCard label="Obras ativas"      value={String(overview?.obrasAtivas ?? 0)}        icon="business"           color={C.blue} />
            <KpiCard label="Usuários"          value={String(overview?.totalUsuarios ?? 0)}       icon="people"             color={C.mint} />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <KpiCard label="Vistorias eng."    value={String(overview?.etapasPendentes ?? 0)}     icon="eye"                color={C.amber} alert={overview?.etapasPendentes ?? 0 > 0} />
            <KpiCard label="KYC pendentes"     value={String(overview?.kycPendentes ?? 0)}        icon="id-card"            color={C.red}   alert={overview?.kycPendentes ?? 0 > 0} />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <KpiCard label="Fila liberação"    value={String(overview?.filaLiberacao ?? 0)}       icon="cash"               color={C.mint} />
            <KpiCard label="Ag. validação"     value={String(overview?.visitasAgendadas ?? 0)}    icon="shield-checkmark"   color={C.blue} alert={overview?.visitasAgendadas ?? 0 > 0} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function KpiCard({ label, value, icon, color, alert }: { label: string; value: string; icon: any; color: string; alert?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.white, borderRadius: 16, padding: 16, gap: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Ionicons name={icon} size={20} color={color} />
        {alert && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }} />}
      </View>
      <Text style={{ fontSize: 26, fontWeight: "800", color: C.ink }}>{value}</Text>
      <Text style={{ fontSize: 11, color: C.gray, fontWeight: "500" }}>{label}</Text>
    </View>
  );
}
