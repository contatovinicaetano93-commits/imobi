import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Jornada } from "../lib/jornada";
import { mapJornadaHrefToMobileRoute } from "../lib/jornada";

type Props = {
  jornada: Jornada;
};

export function JornadaHeroCard({ jornada }: Props) {
  const router = useRouter();
  const route = mapJornadaHrefToMobileRoute(jornada.href);
  const waiting =
    jornada.passoAtual === "aguardando" ||
    (jornada.bloqueado != null && jornada.passoAtual !== "kyc");

  return (
    <View style={styles.card} accessibilityRole="summary" accessibilityLabel="Próximo passo">
      <Text style={styles.eyebrow}>{jornada.concluido ? "Tudo certo" : "Seu próximo passo"}</Text>
      <Text style={styles.title}>{jornada.titulo}</Text>
      <Text style={styles.desc}>{jornada.descricao}</Text>

      {jornada.totalPassos > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${jornada.progressoPct}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            Passo {Math.min(jornada.passosConcluidos + 1, jornada.totalPassos)} de {jornada.totalPassos}
          </Text>
        </View>
      )}

      {!jornada.concluido && !waiting && (
        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push(route as never)}
          accessibilityRole="button"
          accessibilityLabel="Continuar"
        >
          <Text style={styles.ctaText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      {waiting && (
        <View style={styles.waiting}>
          <Ionicons name="time-outline" size={16} color="#fef3c7" />
          <Text style={styles.waitingText}>Aguardando análise</Text>
        </View>
      )}
    </View>
  );
}

export function JornadaHeroSkeleton() {
  return (
    <View style={[styles.card, styles.skeleton]}>
      <ActivityIndicator color="#1B4FD8" />
      <Text style={styles.skeletonText}>Carregando seu próximo passo…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0C1A3D",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },
  desc: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  progressRow: { marginTop: 16, gap: 8 },
  progressTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4ADE80",
    borderRadius: 999,
  },
  progressLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  cta: {
    marginTop: 16,
    backgroundColor: "#1B4FD8",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  waiting: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  waitingText: { color: "#fef3c7", fontSize: 13, fontWeight: "600" },
  skeleton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    gap: 12,
    backgroundColor: "#f3f4f6",
  },
  skeletonText: { color: "#6b7280", fontSize: 13 },
});
