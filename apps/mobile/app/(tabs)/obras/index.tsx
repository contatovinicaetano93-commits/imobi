import { useEffect, useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { obrasApi, type Obra } from "../../../lib/api";
import { haptics } from "../../../lib/haptics";
import { ListSkeleton } from "../../../components/LoadingSkeleton";

const STATUS_LABEL: Record<string, string> = {
  PLANEJAMENTO: "Planejamento",
  EM_ANDAMENTO: "Em andamento",
  PAUSADA: "Pausada",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export default function ObrasScreen() {
  const router = useRouter();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = async () => {
    try {
      const data = await obrasApi.listar();
      setObras(data);
      setError(null);
    } catch (e: any) {
      const errorMsg = e.message ?? "Erro ao carregar obras";
      setError(errorMsg);
      await haptics.error();
    }
  };

  useEffect(() => {
    carregar().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await carregar();
    } finally {
      setRefreshing(false);
    }
  };

  const handleCardPress = (obraId: string) => {
    haptics.tap();
    router.push(`/(tabs)/obras/${obraId}`);
  };

  const handleRetry = async () => {
    setLoading(true);
    await carregar();
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Minhas Obras</Text>
        <ListSkeleton count={3} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minhas Obras</Text>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            accessibilityLabel="Tentar novamente"
            accessibilityRole="button"
            accessibilityHint="Toca para tentar carregar as obras novamente"
          >
            <Text style={styles.retryButtonText}>↻ Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={obras}
        keyExtractor={(o) => o.obraId}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#16a34a"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <Text style={styles.emptyText}>Nenhuma obra cadastrada</Text>
            <Text style={styles.emptySubtext}>
              Crie sua primeira obra para começar
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const etapas = item.etapas ?? [];
          const concluidas = etapas.filter((e) => e.status === "CONCLUIDA").length;
          const progresso = etapas.length ? Math.round((concluidas / etapas.length) * 100) : 0;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleCardPress(item.obraId)}
              accessibilityLabel={item.nome}
              accessibilityRole="button"
              accessibilityHint={`${STATUS_LABEL[item.status] ?? item.status}, ${progresso}% completo`}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.obraNome} numberOfLines={1}>{item.nome}</Text>
                <Text
                  style={styles.progresso}
                  accessibilityLabel={`${progresso} por cento`}
                >
                  {progresso}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progresso}%` as any },
                  ]}
                  accessibilityLabel={`Progresso: ${progresso}%`}
                  accessible={true}
                />
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.meta}>{STATUS_LABEL[item.status] ?? item.status}</Text>
                <Text style={styles.meta}>{etapas.length} etapa{etapas.length !== 1 ? "s" : ""}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        scrollIndicatorInsets={{ right: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 16 },
  errorContainer: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
    gap: 12,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 4,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#9ca3af",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  obraNome: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  progresso: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16a34a",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#16a34a",
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meta: {
    fontSize: 12,
    color: "#6b7280",
  },
});
