import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, TextInput } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../../components/ScreenHeader";
import KeyboardAwareScroll from "../../../../components/KeyboardAwareScroll";
import { managerApi, type EtapaPendente, type KycPendente } from "../../../../lib/api-roles";

type Tab = "etapas" | "kyc";

export default function AdminAprovacoes() {
  const [tab, setTab] = useState<Tab>("etapas");
  const [etapas, setEtapas] = useState<EtapaPendente[]>([]);
  const [kyc, setKyc] = useState<KycPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [motivo, setMotivo] = useState("");

  const load = useCallback(async () => {
    try {
      const [e, k] = await Promise.all([managerApi.etapasPendentes(), managerApi.kycPendentes()]);
      setEtapas(e);
      setKyc(k);
    } catch (e: unknown) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Falha ao carregar fila");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const aprovar = (id: string) => {
    Alert.alert("Aprovar etapa", "Liberar etapa após validação do engenheiro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Aprovar", onPress: async () => {
        try { await managerApi.aprovarEtapa(id); load(); } catch (e: unknown) {
          Alert.alert("Erro", e instanceof Error ? e.message : "Falha");
        }
      }},
    ]);
  };

  const rejeitar = (id: string) => {
    if (!motivo.trim()) {
      Alert.alert("Motivo obrigatório", "Informe o motivo da rejeição.");
      return;
    }
    Alert.alert("Rejeitar etapa", "Confirmar rejeição?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Rejeitar", style: "destructive", onPress: async () => {
        try { await managerApi.rejeitarEtapa(id, motivo); setMotivo(""); load(); } catch (e: unknown) {
          Alert.alert("Erro", e instanceof Error ? e.message : "Falha");
        }
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#DC2626" /></View>;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Aprovações" subtitle="Etapas e KYC — admin" dark accent="#DC2626" />
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === "etapas" && styles.tabActive]} onPress={() => setTab("etapas")}>
          <Text style={[styles.tabText, tab === "etapas" && styles.tabTextActive]}>Etapas ({etapas.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === "kyc" && styles.tabActive]} onPress={() => setTab("kyc")}>
          <Text style={[styles.tabText, tab === "kyc" && styles.tabTextActive]}>KYC ({kyc.length})</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAwareScroll contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {tab === "etapas" ? (
          etapas.length === 0 ? (
            <Text style={styles.empty}>Nenhuma etapa pendente.</Text>
          ) : etapas.map((e) => (
            <View key={e.etapaId} style={styles.card}>
              <View style={styles.cardAccent} />
              <View style={styles.cardBody}>
                <Text style={styles.nome}>{e.nome}</Text>
                <Text style={styles.sub}>{e.obra?.nome ?? "Obra"} · {e.status.replace(/_/g, " ")}</Text>
                <TextInput
                  style={styles.motivoInput}
                  placeholder="Motivo (se rejeitar)"
                  placeholderTextColor="#94A3B8"
                  value={motivo}
                  onChangeText={setMotivo}
                />
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.btnOk} onPress={() => aprovar(e.etapaId)}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <Text style={styles.btnText}>Aprovar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnNo} onPress={() => rejeitar(e.etapaId)}>
                    <Ionicons name="close" size={16} color="#FFF" />
                    <Text style={styles.btnText}>Rejeitar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        ) : (
          kyc.length === 0 ? (
            <Text style={styles.empty}>Nenhum KYC pendente.</Text>
          ) : kyc.map((k) => (
            <View key={k.usuarioId} style={styles.kycCard}>
              <Ionicons name="person-circle-outline" size={36} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{k.nome ?? "Usuário"}</Text>
                <Text style={styles.sub}>{k.email ?? k.usuarioId}</Text>
                <Text style={styles.kycStatus}>{k.kycStatus ?? "PENDENTE"}</Text>
              </View>
            </View>
          ))
        )}
      </KeyboardAwareScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabs: { flexDirection: "row", marginHorizontal: 16, marginTop: 8, backgroundColor: "#E2E8F0", borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#DC2626" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  tabTextActive: { color: "#FFF" },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { textAlign: "center", color: "#64748B", marginTop: 40 },
  card: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 14, overflow: "hidden" },
  cardAccent: { width: 5, backgroundColor: "#DC2626" },
  cardBody: { flex: 1, padding: 14, gap: 6 },
  nome: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  sub: { fontSize: 12, color: "#64748B" },
  motivoInput: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, padding: 10, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 6 },
  btnOk: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: "#16A34A", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  btnNo: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: "#64748B", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  btnText: { color: "#FFF", fontWeight: "700", fontSize: 12 },
  kycCard: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#FFF", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#FECACA" },
  kycStatus: { fontSize: 10, fontWeight: "700", color: "#DC2626", marginTop: 4, letterSpacing: 0.5 },
});
