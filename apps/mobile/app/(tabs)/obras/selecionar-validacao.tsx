import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { useCallback, useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../components/ScreenHeader";
import { obrasApi, type Obra, type Etapa } from "../../../lib/api";

const C = {
  blue: "#1B4FD8", navy: "#0C1A3D", ink: "#0F172A",
  gray: "#64748B", border: "#E2E8F0", surface: "#F8FAFC",
  white: "#FFFFFF", mint: "#22C55E", amber: "#F59E0B",
};

const ETAPA_OK = new Set(["PLANEJADA", "EM_EXECUCAO", "AGUARDANDO_VISTORIA"]);

function etapasValidaveis(obra: Obra): Etapa[] {
  return (obra.etapas ?? []).filter((e) => ETAPA_OK.has(e.status));
}

export default function SelecionarValidacaoScreen() {
  const router = useRouter();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [obraSel, setObraSel] = useState<Obra | null>(null);

  const carregar = useCallback(async () => {
    try {
      const list = await obrasApi.listar();
      setObras(list);
      if (list.length === 1) setObraSel(list[0] ?? null);
    } catch (e: unknown) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível carregar obras.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const irRegistrar = (obra: Obra, etapa: Etapa) => {
    router.push({
      pathname: "/obras/[id]/registrar",
      params: {
        id: obra.obraId,
        etapaId: etapa.etapaId,
        etapaNome: etapa.nome,
        geoLat: String(obra.geoLatitude),
        geoLng: String(obra.geoLongitude),
        raio: String(obra.raioValidacaoMetros || 80),
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.blue} />
      </View>
    );
  }

  if (obras.length === 0) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Registrar etapa" subtitle="Validação para crédito" onBack={() => router.back()} />
        <View style={styles.empty}>
          <Ionicons name="business-outline" size={48} color={C.gray} />
          <Text style={styles.emptyTitle}>Nenhuma obra cadastrada</Text>
          <TouchableOpacity style={styles.cta} onPress={() => router.push("/obras/cadastrar")}>
            <Text style={styles.ctaText}>Cadastrar obra</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Registrar etapa" subtitle="Selecione obra e etapa" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} />}
      >
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={C.blue} />
          <Text style={styles.infoText}>
            Tire a foto da etapa no local da obra. O engenheiro valida a evidência e o admin libera o crédito no comitê.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>1 · ESCOLHA A OBRA</Text>
        {obras.map((obra) => {
          const selected = obraSel?.obraId === obra.obraId;
          const qtd = etapasValidaveis(obra).length;
          return (
            <TouchableOpacity
              key={obra.obraId}
              style={[styles.obraCard, selected && styles.obraCardSel]}
              onPress={() => setObraSel(obra)}
              activeOpacity={0.8}
            >
              <View style={styles.obraIcon}>
                <Ionicons name="home" size={22} color={selected ? C.white : C.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.obraNome}>{obra.nome}</Text>
                <Text style={styles.obraSub} numberOfLines={1}>{obra.endereco}</Text>
                <Text style={styles.obraMeta}>{qtd} etapa{qtd !== 1 ? "s" : ""} disponível{qtd !== 1 ? "is" : ""}</Text>
              </View>
              {selected && <Ionicons name="checkmark-circle" size={22} color={C.blue} />}
            </TouchableOpacity>
          );
        })}

        {obraSel && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>2 · ESCOLHA A ETAPA</Text>
            {etapasValidaveis(obraSel).length === 0 ? (
              <Text style={styles.noEtapa}>Nenhuma etapa pendente nesta obra.</Text>
            ) : (
              etapasValidaveis(obraSel).map((etapa) => (
                <TouchableOpacity
                  key={etapa.etapaId}
                  style={styles.etapaCard}
                  onPress={() => irRegistrar(obraSel, etapa)}
                  activeOpacity={0.85}
                >
                  <View style={styles.etapaLeft}>
                    <Ionicons name="camera" size={20} color={C.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.etapaNome}>{etapa.nome}</Text>
                    <Text style={styles.etapaSub}>{etapa.percentualObra}% da obra · {etapa.status.replace(/_/g, " ")}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={C.gray} />
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 40, gap: 10 },
  infoBox: {
    flexDirection: "row", gap: 10, backgroundColor: "#EEF3FF",
    padding: 14, borderRadius: 12, alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 13, color: C.ink, lineHeight: 19 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, color: C.gray, marginTop: 4 },
  obraCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.white, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: C.border,
  },
  obraCardSel: { borderColor: C.blue, backgroundColor: "#F8FAFF" },
  obraIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: "#EEF3FF",
    justifyContent: "center", alignItems: "center",
  },
  obraNome: { fontSize: 15, fontWeight: "700", color: C.ink },
  obraSub: { fontSize: 12, color: C.gray, marginTop: 2 },
  obraMeta: { fontSize: 11, color: C.blue, fontWeight: "600", marginTop: 4 },
  etapaCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.white, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  etapaLeft: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: C.blue,
    justifyContent: "center", alignItems: "center",
  },
  etapaNome: { fontSize: 14, fontWeight: "700", color: C.ink },
  etapaSub: { fontSize: 11, color: C.gray, marginTop: 2 },
  noEtapa: { fontSize: 13, color: C.gray, padding: 12 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: C.ink },
  cta: { backgroundColor: C.blue, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  ctaText: { color: C.white, fontWeight: "700" },
});
