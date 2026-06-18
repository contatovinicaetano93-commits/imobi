import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, TextInput } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../../components/ScreenHeader";
import KeyboardAwareScroll from "../../../../components/KeyboardAwareScroll";
import { comiteApi, type ComiteItem } from "../../../../lib/api-roles";
import { formatarBRL } from "@imbobi/core";

export default function EngComiteScreen() {
  const [items, setItems] = useState<ComiteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parecer, setParecer] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const all = await comiteApi.listar("ABERTO");
      setItems(all);
    } catch { /* */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const enviarParecer = (id: string) => {
    const txt = parecer[id]?.trim();
    if (!txt || txt.length < 10) {
      Alert.alert("Parecer incompleto", "Descreva o parecer técnico (mín. 10 caracteres).");
      return;
    }
    Alert.alert("Enviar parecer", "Confirmar parecer técnico?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Enviar", onPress: async () => {
        try {
          await comiteApi.parecer(id, txt);
          setParecer((p) => ({ ...p, [id]: "" }));
          load();
        } catch (e: unknown) {
          Alert.alert("Erro", e instanceof Error ? e.message : "Falha");
        }
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#2563EB" /></View>;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Parecer técnico" subtitle="Análise de crédito — engenheiro" dark accent="#2563EB" />
      <KeyboardAwareScroll contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <View style={styles.checklist}>
          <CheckItem text="Verificar viabilidade da obra" />
          <CheckItem text="Conferir evidências georreferenciadas" />
          <CheckItem text="Avaliar risco técnico da etapa" />
        </View>

        {items.length === 0 ? (
          <Text style={styles.empty}>Nenhuma solicitação aguardando parecer.</Text>
        ) : items.map((c) => (
          <View key={c.comiteId} style={styles.card}>
            <View style={styles.cardTop}>
              <Ionicons name="clipboard" size={22} color="#2563EB" />
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{c.obra?.nome ?? "Solicitação"}</Text>
                <Text style={styles.valor}>{formatarBRL(c.valorSolicitado)}</Text>
              </View>
            </View>
            <Text style={styles.hint}>Descreva condições, riscos e recomendação técnica:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Fundação conforme projeto. Recomendo aprovação com liberação por etapa..."
              placeholderTextColor="#94A3B8"
              value={parecer[c.comiteId] ?? ""}
              onChangeText={(t) => setParecer((p) => ({ ...p, [c.comiteId]: t }))}
              multiline
            />
            <TouchableOpacity style={styles.btn} onPress={() => enviarParecer(c.comiteId)}>
              <Ionicons name="send" size={16} color="#FFF" />
              <Text style={styles.btnText}>Enviar parecer</Text>
            </TouchableOpacity>
          </View>
        ))}
      </KeyboardAwareScroll>
    </View>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <View style={styles.checkRow}>
      <Ionicons name="checkbox-outline" size={16} color="#2563EB" />
      <Text style={styles.checkText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EFF6FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  checklist: { backgroundColor: "#FFF", borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: "#BFDBFE" },
  checkRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  checkText: { fontSize: 12, color: "#334155" },
  empty: { textAlign: "center", color: "#64748B", marginTop: 32 },
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: "#BFDBFE" },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  nome: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  valor: { fontSize: 20, fontWeight: "800", color: "#2563EB", marginTop: 2 },
  hint: { fontSize: 12, color: "#64748B" },
  input: { borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 12, padding: 12, fontSize: 13, minHeight: 90, textAlignVertical: "top", color: "#0F172A" },
  btn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#2563EB", padding: 14, borderRadius: 12 },
  btnText: { color: "#FFF", fontWeight: "700" },
});
