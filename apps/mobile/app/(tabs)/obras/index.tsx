import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { formatarBRL } from "@imbobi/core";

const OBRAS_MOCK = [
  { id: "1", nome: "Residência Jardins", progresso: 45, proximaEtapa: "Revestimento", valorCredito: 180000 },
  { id: "2", nome: "Sobrado Alphaville", progresso: 20, proximaEtapa: "Estrutura", valorCredito: 250000 },
];

export default function ObrasScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minhas Obras</Text>
      <FlatList
        data={OBRAS_MOCK}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(tabs)/obras/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.obraNome}>{item.nome}</Text>
              <Text style={styles.progresso}>{item.progresso}%</Text>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${item.progresso}%` }]} />
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.meta}>Crédito: {formatarBRL(item.valorCredito)}</Text>
              <Text style={styles.meta}>Próxima: {item.proximaEtapa}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  obraNome: { fontSize: 16, fontWeight: "600", color: "#111827" },
  progresso: { fontSize: 16, fontWeight: "700", color: "#16a34a" },
  progressBar: { height: 6, backgroundColor: "#f3f4f6", borderRadius: 99, overflow: "hidden", marginBottom: 12 },
  progressFill: { height: "100%", backgroundColor: "#16a34a", borderRadius: 99 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  meta: { fontSize: 13, color: "#6b7280" },
});
