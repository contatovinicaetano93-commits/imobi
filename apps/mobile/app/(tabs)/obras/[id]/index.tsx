import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { formatarBRL } from "@imbobi/core";

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PENDENTE:              { bg: "#f3f4f6", text: "#6b7280" },
  EM_PROGRESSO:          { bg: "#dbeafe", text: "#1d4ed8" },
  AGUARDANDO_VISTORIA:   { bg: "#fef9c3", text: "#92400e" },
  APROVADA:              { bg: "#dcfce7", text: "#166534" },
  REJEITADA:             { bg: "#fee2e2", text: "#991b1b" },
};

// Dados mock — substituir por fetch real com SWR/React Query
const OBRA_MOCK = {
  id: "1",
  nome: "Residência Jardins",
  endereco: "Rua das Flores, 120 — São Paulo, SP",
  progresso: 45,
  valorCredito: 180000,
  valorLiberado: 81000,
  geoLat: -23.5505,
  geoLng: -46.6333,
  raioMetros: 80,
  etapas: [
    { id: "e1", nome: "Fundação",               ordem: 1, percentual: 15, status: "APROVADA",            valorLiberacao: 27000 },
    { id: "e2", nome: "Estrutura",               ordem: 2, percentual: 20, status: "APROVADA",            valorLiberacao: 36000 },
    { id: "e3", nome: "Alvenaria",               ordem: 3, percentual: 10, status: "EM_PROGRESSO",        valorLiberacao: 18000 },
    { id: "e4", nome: "Cobertura",               ordem: 4, percentual: 10, status: "PENDENTE",            valorLiberacao: 18000 },
    { id: "e5", nome: "Instalações Elétricas",   ordem: 5, percentual: 10, status: "PENDENTE",            valorLiberacao: 18000 },
    { id: "e6", nome: "Instalações Hidráulicas", ordem: 6, percentual: 10, status: "PENDENTE",            valorLiberacao: 18000 },
    { id: "e7", nome: "Revestimento",            ordem: 7, percentual: 10, status: "PENDENTE",            valorLiberacao: 18000 },
    { id: "e8", nome: "Acabamento",              ordem: 8, percentual: 10, status: "PENDENTE",            valorLiberacao: 18000 },
    { id: "e9", nome: "Entrega",                 ordem: 9, percentual:  5, status: "PENDENTE",            valorLiberacao:  9000 },
  ],
};

export default function ObraDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const obra = OBRA_MOCK; // trocar por: const { data: obra } = useObra(id)

  const podeRegistrar = (status: string) =>
    status === "EM_PROGRESSO" || status === "PENDENTE";

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.nome}>{obra.nome}</Text>
        <Text style={styles.endereco}>{obra.endereco}</Text>
      </View>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <KpiCard label="Crédito total" value={formatarBRL(obra.valorCredito)} />
        <KpiCard label="Liberado" value={formatarBRL(obra.valorLiberado)} green />
        <KpiCard label="Progresso" value={`${obra.progresso}%`} green />
      </View>

      {/* Barra geral */}
      <View style={styles.progressBlock}>
        <Text style={styles.sectionTitle}>Andamento geral</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${obra.progresso}%` as `${number}%` }]} />
        </View>
      </View>

      {/* Etapas */}
      <Text style={styles.sectionTitle}>Etapas</Text>
      {obra.etapas.map((etapa) => {
        const colors = STATUS_COLOR[etapa.status] ?? STATUS_COLOR["PENDENTE"]!;
        return (
          <View key={etapa.id} style={styles.etapaCard}>
            <View style={styles.etapaTop}>
              <View style={styles.etapaInfo}>
                <Text style={styles.etapaNome}>
                  {etapa.ordem}. {etapa.nome}
                </Text>
                <Text style={styles.etapaValor}>{formatarBRL(etapa.valorLiberacao)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {etapa.status.replace(/_/g, " ")}
                </Text>
              </View>
            </View>

            {podeRegistrar(etapa.status) && (
              <TouchableOpacity
                style={styles.registrarBtn}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/obras/[id]/registrar",
                    params: {
                      id: obra.id,
                      etapaId: etapa.id,
                      etapaNome: etapa.nome,
                      geoLat: String(obra.geoLat),
                      geoLng: String(obra.geoLng),
                      raio: String(obra.raioMetros),
                    },
                  })
                }
              >
                <Text style={styles.registrarBtnText}>📸 Registrar etapa</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function KpiCard({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, green && { color: "#16a34a" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 20, paddingTop: 56, gap: 16, paddingBottom: 40 },
  header: { gap: 4 },
  nome: { fontSize: 22, fontWeight: "700", color: "#111827" },
  endereco: { fontSize: 14, color: "#6b7280" },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpiCard: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6 },
  kpiLabel: { fontSize: 11, color: "#9ca3af", marginBottom: 4 },
  kpiValue: { fontSize: 15, fontWeight: "700", color: "#111827" },
  progressBlock: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  barBg: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 99, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#16a34a", borderRadius: 99 },
  etapaCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, gap: 12 },
  etapaTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  etapaInfo: { flex: 1, gap: 2 },
  etapaNome: { fontSize: 15, fontWeight: "600", color: "#111827" },
  etapaValor: { fontSize: 13, color: "#6b7280" },
  badge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  registrarBtn: { backgroundColor: "#f0fdf4", borderWidth: 1.5, borderColor: "#86efac", borderRadius: 12, padding: 12, alignItems: "center" },
  registrarBtnText: { fontSize: 14, fontWeight: "600", color: "#16a34a" },
});
