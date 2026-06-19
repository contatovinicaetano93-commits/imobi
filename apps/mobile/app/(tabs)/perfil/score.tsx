import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { scoreApi, type ScoreData, type ScoreHistorico } from "../../../lib/api";

function ScoreRing({ score }: { score: number }) {
  const cor = score >= 800 ? "#16a34a" : score >= 650 ? "#2563eb" : score >= 450 ? "#ca8a04" : "#6b7280";
  return (
    <View style={[styles.ring, { borderColor: cor }]}>
      <Text style={[styles.ringScore, { color: cor }]}>{score}</Text>
      <Text style={styles.ringLabel}>de 1000</Text>
    </View>
  );
}

export default function ScoreScreen() {
  const router = useRouter();
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [historico, setHistorico] = useState<ScoreHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setError(null);
      const [scoreRes, histRes] = await Promise.all([
        scoreApi.obter(),
        scoreApi.historico(8),
      ]);
      setScoreData(scoreRes);
      setHistorico(histRes.data);
    } catch {
      setError("Não foi possível carregar o score.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (error || !scoreData) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Erro ao carregar."}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={carregar}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Meu Score</Text>
      </View>

      <View style={styles.card}>
        <ScoreRing score={scoreData.score} />
        <Text style={styles.nivel}>{scoreData.nivel}</Text>
        <Text style={styles.descricao}>{scoreData.descricao}</Text>
      </View>

      {historico.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico</Text>
          {historico.map((h) => (
            <View key={h.scoreHistoricoId} style={styles.histRow}>
              <View>
                <Text style={styles.histScore}>{h.score}</Text>
                <Text style={styles.histMotivo}>{h.motivo ?? "Cálculo automático"}</Text>
              </View>
              <Text style={styles.histData}>
                {new Date(h.criadoEm).toLocaleDateString("pt-BR")}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 52, paddingBottom: 20 },
  back: { padding: 4 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  ring: { width: 140, height: 140, borderRadius: 70, borderWidth: 8, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  ringScore: { fontSize: 40, fontWeight: "800" },
  ringLabel: { fontSize: 12, color: "#9ca3af" },
  nivel: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 6 },
  descricao: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  histRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  histScore: { fontSize: 16, fontWeight: "700", color: "#111827" },
  histMotivo: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  histData: { fontSize: 12, color: "#9ca3af" },
  errorText: { fontSize: 15, color: "#ef4444", textAlign: "center", marginBottom: 16 },
  retryBtn: { backgroundColor: "#16a34a", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: "#fff", fontWeight: "600" },
});
