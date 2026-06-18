import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../../components/ScreenHeader";
import { managerApi, type EtapaPendente, type KycPendente } from "../../../../lib/api-roles";

type Tab = "etapas" | "kyc";

export default function GestorFilasScreen() {
  const [tab, setTab] = useState<Tab>("etapas");
  const [etapas, setEtapas] = useState<EtapaPendente[]>([]);
  const [kyc, setKyc] = useState<KycPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [e, k] = await Promise.all([managerApi.etapasPendentes(), managerApi.kycPendentes()]);
      setEtapas(e);
      setKyc(k);
    } catch { /* */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const aprovar = (id: string) => {
    Alert.alert("Aprovar liberação", "Confirmar liberação de etapa?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Aprovar", onPress: async () => {
        try { await managerApi.aprovarEtapa(id); load(); } catch (e: unknown) {
          Alert.alert("Erro", e instanceof Error ? e.message : "Falha");
        }
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#7C3AED" /></View>;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Filas operacionais" subtitle="Validar etapas e KYC" dark accent="#7C3AED" />
      <View style={styles.seg}>
        {(["etapas", "kyc"] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.segBtn, tab === t && styles.segActive]} onPress={() => setTab(t)}>
            <Text style={[styles.segText, tab === t && styles.segTextActive]}>
              {t === "etapas" ? `Etapas (${etapas.length})` : `KYC (${kyc.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {tab === "etapas" ? (
          etapas.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="checkmark-circle" size={40} color="#C4B5FD" />
              <Text style={styles.empty}>Fila de etapas vazia.</Text>
            </View>
          ) : etapas.map((e) => (
            <View key={e.etapaId} style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.etapaTag}>{e.nome.split(" ")[0]}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.nome}>{e.nome}</Text>
                <Text style={styles.obra}>{e.obra?.nome ?? "Obra"}</Text>
                <Text style={styles.status}>{e.status.replace(/_/g, " ")}</Text>
                <TouchableOpacity style={styles.btn} onPress={() => aprovar(e.etapaId)}>
                  <Text style={styles.btnText}>Liberar etapa</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          kyc.length === 0 ? (
            <Text style={styles.empty}>Nenhum KYC pendente.</Text>
          ) : kyc.map((k) => (
            <View key={k.usuarioId} style={styles.kycRow}>
              <Ionicons name="document-attach" size={24} color="#7C3AED" />
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{k.nome ?? "Construtor"}</Text>
                <Text style={styles.obra}>{k.email ?? ""}</Text>
              </View>
              <View style={styles.kycBadge}><Text style={styles.kycBadgeText}>REVISAR</Text></View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  seg: { flexDirection: "row", margin: 16, marginBottom: 0, gap: 8 },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 20, borderWidth: 1, borderColor: "#DDD6FE" },
  segActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  segText: { fontSize: 12, fontWeight: "700", color: "#7C3AED" },
  segTextActive: { color: "#FFF" },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  emptyWrap: { alignItems: "center", gap: 12, marginTop: 48 },
  empty: { color: "#64748B", textAlign: "center" },
  card: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#EDE9FE" },
  cardLeft: { width: 56, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center", padding: 8 },
  etapaTag: { color: "#FFF", fontSize: 10, fontWeight: "800", textAlign: "center", textTransform: "uppercase" },
  cardRight: { flex: 1, padding: 14, gap: 4 },
  nome: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  obra: { fontSize: 12, color: "#64748B" },
  status: { fontSize: 10, color: "#7C3AED", fontWeight: "600", letterSpacing: 0.5 },
  btn: { backgroundColor: "#7C3AED", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, alignSelf: "flex-start", marginTop: 6 },
  btnText: { color: "#FFF", fontWeight: "700", fontSize: 12 },
  kycRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF", padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "#EDE9FE" },
  kycBadge: { backgroundColor: "#EDE9FE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  kycBadgeText: { fontSize: 9, fontWeight: "800", color: "#7C3AED" },
});
