import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatarBRL, formatarPercentual } from "@imbobi/core";
import Slider from "@react-native-community/slider";
import ScreenHeader from "../../../components/ScreenHeader";
import { creditoApi, type Credito, type SimulacaoCreditoResult } from "../../../lib/api";
import { comiteApi, type SolicitacaoComite } from "../../../lib/api-roles";
import {
  TAXA_SIMULACAO,
  formatTaxaSimulacao,
  formatTaxaFaixaAprovacao,
  MSG_TAXA_VARIA,
} from "../../../lib/tax-config";

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  ATIVO: { label: "Ativo", bg: "#dcfce7", color: "#166534" },
  QUITADO: { label: "Quitado", bg: "#f3f4f6", color: "#6b7280" },
  INADIMPLENTE: { label: "Inadimplente", bg: "#fee2e2", color: "#991b1b" },
  PENDENTE: { label: "Análise", bg: "#FEF3C7", color: "#92400E" },
  EM_COMITE: { label: "Em comitê", bg: "#DBEAFE", color: "#1D4ED8" },
  APROVADO: { label: "Aprovado", bg: "#dcfce7", color: "#166534" },
  APROVADA: { label: "Aprovado", bg: "#dcfce7", color: "#166534" },
  REPROVADO: { label: "Reprovado", bg: "#fee2e2", color: "#991b1b" },
  REPROVADA: { label: "Reprovado", bg: "#fee2e2", color: "#991b1b" },
};

const PIPELINE = [
  { key: "simulacao", label: "Simulação\n1,90%" },
  { key: "comite", label: "Comitê" },
  { key: "parecer", label: "Parecer" },
  { key: "voto", label: "Taxa final" },
];

export default function CreditoScreen() {
  const router = useRouter();
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoComite[]>([]);
  const [loading, setLoading] = useState(true);
  const [solicitando, setSolicitando] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [valorSolicitado, setValorSolicitado] = useState(100000);
  const [prazoMeses, setPrazoMeses] = useState(36);
  const [resultado, setResultado] = useState<SimulacaoCreditoResult | null>(null);

  const simular = useCallback(async () => {
    setSimLoading(true);
    try {
      setResultado(await creditoApi.simular(valorSolicitado, prazoMeses));
    } catch {
      setResultado(null);
    }
    setSimLoading(false);
  }, [valorSolicitado, prazoMeses]);

  useEffect(() => {
    const t = setTimeout(simular, 400);
    return () => clearTimeout(t);
  }, [simular]);

  useEffect(() => {
    Promise.all([
      creditoApi.meus().catch(() => []),
      comiteApi.minhas().catch(() => []),
    ]).then(([c, s]) => {
      setCreditos(c);
      setSolicitacoes(s);
    }).finally(() => setLoading(false));
  }, []);

  const solicitarCredito = async () => {
    if (!resultado) return;
    setSolicitando(true);
    try {
      await comiteApi.solicitar({
        valorSolicitado,
        prazoMeses,
        taxaMensal: TAXA_SIMULACAO,
        finalidade: "Financiamento de obra",
        observacoes: "Simulação na taxa máxima 1,90% a.m.",
      });
      setSolicitacoes(await comiteApi.minhas());
      Alert.alert(
        "Solicitação enviada",
        "Simulamos na taxa máxima de 1,90% a.m. O comitê pode aprovar com taxa menor — você será notificado."
      );
    } catch (e: unknown) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível solicitar crédito.");
    } finally {
      setSolicitando(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Crédito"
        subtitle="Parcela máxima garantida"
        onBack={() => router.navigate("/(tabs)/obras")}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <View style={styles.taxBadge}>
            <Text style={styles.taxBadgeLabel}>TRAVA SIMULAÇÃO</Text>
            <Text style={styles.taxBadgeVal}>{formatTaxaSimulacao()}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.heroTitle}>Simulador IMOBI</Text>
            <Text style={styles.heroSub}>{MSG_TAXA_VARIA}</Text>
            <Text style={styles.heroFaixa}>Aprovação: {formatTaxaFaixaAprovacao()}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#1B4FD8" style={{ marginVertical: 12 }} />
        ) : (
          <>
            {solicitacoes.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Minhas solicitações</Text>
                {solicitacoes.map((s) => {
                  const meta = STATUS_LABEL[s.status] ?? { label: s.status, bg: "#f3f4f6", color: "#374151" };
                  const aprovadaMenor = s.taxaMensal < TAXA_SIMULACAO && s.status.includes("APROV");
                  return (
                    <View key={s.solicitacaoId} style={styles.solCard}>
                      <View style={styles.solHeader}>
                        <Text style={styles.solValor}>{formatarBRL(s.valorSolicitado)}</Text>
                        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                          <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                      </View>
                      <View style={styles.pipeline}>
                        {PIPELINE.map((p, i) => (
                          <View key={p.key} style={styles.pipeItem}>
                            <View style={[styles.pipeDot, i <= 1 && styles.pipeDotActive]} />
                            <Text style={styles.pipeLabel}>{p.label}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.solMeta}>
                        {s.prazoMeses}m · Simulado {formatTaxaSimulacao()}
                        {aprovadaMenor ? ` → Aprovado ${formatarPercentual(s.taxaMensal)}` : ""}
                      </Text>
                    </View>
                  );
                })}
              </>
            )}

            {creditos.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Créditos ativos</Text>
                {creditos.map((c) => {
                  const meta = STATUS_LABEL[c.status] ?? { label: c.status, bg: "#f3f4f6", color: "#374151" };
                  const pct = c.valorAprovado > 0 ? Math.round((c.valorLiberado / c.valorAprovado) * 100) : 0;
                  const melhorTaxa = c.taxaMensal < TAXA_SIMULACAO;
                  return (
                    <View key={c.creditoId} style={styles.creditCard}>
                      <View style={styles.creditHeader}>
                        <Text style={styles.creditLabel}>Aprovado</Text>
                        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                          <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.creditValor}>{formatarBRL(c.valorAprovado)}</Text>
                      <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
                      <Text style={styles.progressText}>
                        {pct}% liberado · Taxa {formatarPercentual(c.taxaMensal)}
                        {melhorTaxa ? " (abaixo da simulação ✓)" : ""}
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>Nova simulação</Text>
        <View style={styles.sliderBlock}>
          <View style={styles.sliderLabel}>
            <Text style={styles.label}>Valor desejado</Text>
            <Text style={styles.sliderValue}>{formatarBRL(valorSolicitado)}</Text>
          </View>
          <Slider minimumValue={10000} maximumValue={1000000} step={5000} value={valorSolicitado}
            onValueChange={setValorSolicitado} minimumTrackTintColor="#22C55E" thumbTintColor="#22C55E" />
        </View>
        <View style={styles.sliderBlock}>
          <View style={styles.sliderLabel}>
            <Text style={styles.label}>Prazo</Text>
            <Text style={styles.sliderValue}>{prazoMeses} meses</Text>
          </View>
          <Slider minimumValue={12} maximumValue={180} step={12} value={prazoMeses}
            onValueChange={setPrazoMeses} minimumTrackTintColor="#22C55E" thumbTintColor="#22C55E" />
        </View>

        {simLoading ? (
          <ActivityIndicator color="#1B4FD8" />
        ) : resultado ? (
          <View style={styles.resultCard}>
            <View style={styles.resultTaxRow}>
              <Ionicons name="lock-closed" size={16} color="#BBF7D0" />
              <Text style={styles.resultTax}>Taxa máxima: {formatTaxaSimulacao()}</Text>
            </View>
            <Text style={styles.resultHint}>Parcela calculada no pior cenário — comitê pode reduzir a taxa</Text>
            <ResultRow label="Parcela mensal (máx.)" value={formatarBRL(resultado.parcelaMensal)} big />
            <View style={styles.divider} />
            <ResultRow label="Total pago" value={formatarBRL(resultado.totalPago)} />
            <ResultRow label="Total de juros" value={formatarBRL(resultado.totalJuros)} />
            <ResultRow label="CET ao ano" value={formatarPercentual(resultado.cet)} />
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.solicitarBtn, (solicitando || !resultado) && styles.btnDisabled]}
          onPress={solicitarCredito}
          disabled={solicitando || !resultado}
        >
          {solicitando ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="paper-plane" size={18} color="#fff" />
              <Text style={styles.solicitarBtnText}>Enviar ao comitê</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ResultRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: "#BBF7D0", fontSize: 14, flex: 1, paddingRight: 8 }}>{label}</Text>
      <Text style={{ color: "#fff", fontSize: big ? 22 : 15, fontWeight: big ? "800" : "600" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F0FDF4" },
  scroll: { flex: 1 },
  container: { padding: 20, gap: 16, paddingBottom: 40 },
  hero: { flexDirection: "row", gap: 14, backgroundColor: "#FFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#BBF7D0", alignItems: "center" },
  taxBadge: { backgroundColor: "#14532D", borderRadius: 12, padding: 12, alignItems: "center", minWidth: 88 },
  taxBadgeLabel: { fontSize: 8, fontWeight: "800", color: "#BBF7D0", letterSpacing: 0.5 },
  taxBadgeVal: { fontSize: 16, fontWeight: "800", color: "#FFF", marginTop: 4 },
  heroTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  heroSub: { fontSize: 12, color: "#64748B", lineHeight: 17 },
  heroFaixa: { fontSize: 11, color: "#16A34A", fontWeight: "600" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#374151", letterSpacing: 0.3 },
  solCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, gap: 10, borderLeftWidth: 4, borderLeftColor: "#22C55E" },
  solHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  solValor: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  solMeta: { fontSize: 12, color: "#64748B" },
  pipeline: { flexDirection: "row", justifyContent: "space-between" },
  pipeItem: { alignItems: "center", flex: 1, gap: 4 },
  pipeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E2E8F0" },
  pipeDotActive: { backgroundColor: "#22C55E" },
  pipeLabel: { fontSize: 8, color: "#64748B", textAlign: "center", lineHeight: 11 },
  creditCard: { backgroundColor: "#fff", borderRadius: 16, padding: 18, gap: 10 },
  creditHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  creditLabel: { fontSize: 13, color: "#6b7280" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  creditValor: { fontSize: 26, fontWeight: "800", color: "#111827" },
  progressBar: { height: 6, backgroundColor: "#f3f4f6", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: "#22C55E", borderRadius: 3 },
  progressText: { fontSize: 12, color: "#6b7280" },
  sliderBlock: { backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  sliderLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  sliderValue: { fontSize: 15, color: "#16A34A", fontWeight: "700" },
  resultCard: { backgroundColor: "#14532D", borderRadius: 20, padding: 20, gap: 4 },
  resultTaxRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 4 },
  resultTax: { fontSize: 13, fontWeight: "700", color: "#BBF7D0" },
  resultHint: { fontSize: 11, color: "#86EFAC", marginBottom: 8, lineHeight: 16 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 8 },
  solicitarBtn: {
    flexDirection: "row", gap: 10, backgroundColor: "#16A34A", borderRadius: 16,
    padding: 18, alignItems: "center", justifyContent: "center",
  },
  solicitarBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnDisabled: { opacity: 0.55 },
});
