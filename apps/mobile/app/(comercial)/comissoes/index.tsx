import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert, Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { parceiroApi, type ParceiroResumo, type OperacaoIndicada } from "../../../lib/api";
import { formatarBRL } from "@imbobi/core";

const COMISSAO_CONFIG: Record<string, { label: string; cor: string }> = {
  AGUARDANDO_CONVERSAO: { label: "Aguardando", cor: "#d97706" },
  PENDENTE_PAGAMENTO:   { label: "A receber",  cor: "#2563eb" },
  PAGO:                 { label: "Pago",        cor: "#16a34a" },
};

function CodigoCard({ codigo }: { codigo: string }) {
  const copiar = () => {
    Clipboard.setString(codigo);
    Alert.alert("Copiado!", `Código ${codigo} copiado.`);
  };
  return (
    <View style={s.codigoCard}>
      <Text style={s.codigoLabel}>Seu código de indicação</Text>
      <View style={s.codigoRow}>
        <Text style={s.codigo}>{codigo}</Text>
        <TouchableOpacity onPress={copiar} style={s.copiarBtn}>
          <Ionicons name="copy-outline" size={18} color="#16a34a" />
          <Text style={s.copiarText}>Copiar</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.codigoSub}>Validade: 90 dias por indicação</Text>
    </View>
  );
}

function ResumoCard({ resumo }: { resumo: ParceiroResumo }) {
  return (
    <View style={s.resumoGrid}>
      <View style={s.resumoItem}>
        <Text style={s.resumoValor}>{formatarBRL(resumo.comissoesAReceber)}</Text>
        <Text style={s.resumoLabel}>A receber</Text>
      </View>
      <View style={s.resumoItem}>
        <Text style={s.resumoValor}>{formatarBRL(resumo.comissoesPagasMes)}</Text>
        <Text style={s.resumoLabel}>Pago este mês</Text>
      </View>
      <View style={s.resumoItem}>
        <Text style={s.resumoValor}>{resumo.taxaAprovacao}%</Text>
        <Text style={s.resumoLabel}>Taxa aprovação</Text>
      </View>
      <View style={s.resumoItem}>
        <Text style={s.resumoValor}>{resumo.operacoesAtivas}</Text>
        <Text style={s.resumoLabel}>Ops. ativas</Text>
      </View>
    </View>
  );
}

export default function ComissoesScreen() {
  const [resumo, setResumo] = useState<ParceiroResumo | null>(null);
  const [operacoes, setOperacoes] = useState<OperacaoIndicada[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [r, ops] = await Promise.all([parceiroApi.resumo(), parceiroApi.operacoes()]);
      setResumo(r);
      setOperacoes(ops);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar comissões");
    }
  }, []);

  useEffect(() => { carregar().finally(() => setLoading(false)); }, [carregar]);

  const onRefresh = async () => { setRefreshing(true); await carregar(); setRefreshing(false); };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#16a34a" /></View>;

  return (
    <FlatList
      style={s.scroll}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
      data={operacoes}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={
        <>
          <Text style={s.title}>Comissões</Text>
          {error && <Text style={s.error}>{error}</Text>}
          {resumo && (
            <>
              <CodigoCard codigo={resumo.codigoIndicacao} />
              <ResumoCard resumo={resumo} />
              {operacoes.length > 0 && (
                <Text style={s.sectionLabel}>Histórico de operações</Text>
              )}
            </>
          )}
        </>
      }
      ListEmptyComponent={
        !loading ? (
          <View style={s.empty}>
            <Ionicons name="cash-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyText}>Nenhuma operação indicada ainda.</Text>
          </View>
        ) : null
      }
      renderItem={({ item: op }) => {
        const cfg = COMISSAO_CONFIG[op.comissaoStatus] ?? { label: op.comissaoStatus, cor: "#6b7280" };
        const validade = new Date(op.validadeIndicacao);
        const expirado = validade < new Date();
        return (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardCodigo}>{op.codigo}</Text>
              <View style={[s.statusTag, { backgroundColor: cfg.cor + "18" }]}>
                <Text style={[s.statusText, { color: cfg.cor }]}>{cfg.label}</Text>
              </View>
            </View>
            <Text style={s.clienteRef}>{op.clienteRef}</Text>
            <Text style={s.cardStatus}>{op.status}</Text>
            <View style={s.cardFooter}>
              <Text style={s.comissao}>
                {op.percentualComissao}% · {op.valorComissao > 0 ? formatarBRL(op.valorComissao) : "—"}
              </Text>
              <Text style={[s.validade, expirado && s.expirado]}>
                {expirado ? "Expirado" : `Val. ${validade.toLocaleDateString("pt-BR")}`}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 56, gap: 12, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  error: { color: "#dc2626", fontSize: 14 },
  codigoCard: { backgroundColor: "#16a34a", borderRadius: 16, padding: 16, gap: 8 },
  codigoLabel: { fontSize: 12, color: "#dcfce7" },
  codigoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  codigo: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  copiarBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  copiarText: { fontSize: 13, fontWeight: "600", color: "#16a34a" },
  codigoSub: { fontSize: 11, color: "#dcfce7" },
  resumoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  resumoItem: { flex: 1, minWidth: "45%", backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 4, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  resumoValor: { fontSize: 18, fontWeight: "800", color: "#111827" },
  resumoLabel: { fontSize: 11, color: "#9ca3af" },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  empty: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { color: "#9ca3af", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 6, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardCodigo: { fontSize: 13, fontWeight: "700", color: "#374151" },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "600" },
  clienteRef: { fontSize: 15, fontWeight: "700", color: "#111827" },
  cardStatus: { fontSize: 12, color: "#6b7280" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  comissao: { fontSize: 13, color: "#374151", fontWeight: "600" },
  validade: { fontSize: 12, color: "#9ca3af" },
  expirado: { color: "#dc2626" },
});
