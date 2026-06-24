import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useJornada } from "../../../hooks/use-jornada";
import { JornadaHeroCard, JornadaHeroSkeleton } from "../../../components/JornadaHeroCard";
import { useRouter } from "expo-router";
import { mapJornadaHrefToMobileRoute } from "../../../lib/jornada";

export default function InicioScreen() {
  const { jornada, loading, error, refresh } = useJornada();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>IMOBI</Text>
        <Text style={styles.subtitle}>Painel do construtor</Text>

        {loading && <JornadaHeroSkeleton />}

        {!loading && error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void refresh()}>
              <Text style={styles.retry}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && jornada && <JornadaHeroCard jornada={jornada} />}

        <View style={styles.quickLinks}>
          <Text style={styles.sectionTitle}>Atalhos</Text>
          <TouchableOpacity style={styles.link} onPress={() => router.push("/(tabs)/kyc")}>
            <Text style={styles.linkText}>Verificação KYC</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.link} onPress={() => router.push("/(tabs)/obras")}>
            <Text style={styles.linkText}>Minhas obras</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.link} onPress={() => router.push("/(tabs)/credito")}>
            <Text style={styles.linkText}>Crédito</Text>
          </TouchableOpacity>
          {jornada && !jornada.concluido && (
            <TouchableOpacity
              style={[styles.link, styles.linkPrimary]}
              onPress={() => router.push(mapJornadaHrefToMobileRoute(jornada.href) as never)}
            >
              <Text style={styles.linkTextPrimary}>Ir para o próximo passo</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  container: { padding: 20, paddingBottom: 40 },
  brand: { fontSize: 28, fontWeight: "800", color: "#0C1A3D" },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 20 },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: "#b91c1c", fontSize: 14 },
  retry: { color: "#1B4FD8", fontWeight: "600", marginTop: 8 },
  quickLinks: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 4 },
  link: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  linkPrimary: { backgroundColor: "#1B4FD8", borderColor: "#1B4FD8" },
  linkText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  linkTextPrimary: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
