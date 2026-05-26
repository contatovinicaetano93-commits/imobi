import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput,
  RefreshControl, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "@imbobi/core";

type Parceiro = {
  parceiroId: string;
  nome: string;
  servico: string;
  descricao: string;
  rating: number;
  reviewCount: number;
  latitude: number;
  longitude: number;
  distanciaKm?: number;
  telefone?: string;
  email?: string;
};

const SERVICOS = [
  "Elétrica",
  "Encanamento",
  "Estrutura",
  "Pintura",
  "Acabamento",
  "Cobertura",
  "Alvenaria",
];

export default function MarketplaceScreen() {
  const router = useRouter();
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [filtrados, setFiltrados] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [servicoSelecionado, setServicoSelecionado] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const carregarParceiros = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (!token) throw new Error("Não autenticado");

      // Obter localização do usuário
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation(loc.coords as any);
      }

      const data = await apiClient.get<Parceiro[]>("/api/v1/parceiros", token);
      setParceiros(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar parceiros");
    }
  }, []);

  useEffect(() => {
    carregarParceiros().finally(() => setLoading(false));
  }, [carregarParceiros]);

  useEffect(() => {
    let resultado = parceiros;

    if (servicoSelecionado) {
      resultado = resultado.filter((p) => p.servico === servicoSelecionado);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      resultado = resultado.filter(
        (p) => p.nome.toLowerCase().includes(query) || p.servico.toLowerCase().includes(query)
      );
    }

    setFiltrados(resultado);
  }, [parceiros, servicoSelecionado, searchQuery]);

  const distancia = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getParceirosComDistancia = () => {
    if (!userLocation) return filtrados;
    return filtrados.map((p) => ({
      ...p,
      distanciaKm: distancia(userLocation.latitude, userLocation.longitude, p.latitude, p.longitude),
    })).sort((a, b) => (a.distanciaKm ?? 999) - (b.distanciaKm ?? 999));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const parca_com_distancia = getParceirosComDistancia();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parceiros</Text>
        <Text style={styles.subtitle}>Encontre profissionais para sua obra</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar parceiro..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.servicosScroll}
        style={styles.servicosContainer}
      >
        {SERVICOS.map((servico) => (
          <TouchableOpacity
            key={servico}
            style={[styles.servicoTag, servicoSelecionado === servico && styles.servicoTagActive]}
            onPress={() => setServicoSelecionado(servicoSelecionado === servico ? null : servico)}
          >
            <Text
              style={[
                styles.servicoTagText,
                servicoSelecionado === servico && styles.servicoTagTextActive,
              ]}
            >
              {servico}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={parca_com_distancia}
        keyExtractor={(p) => p.parceiroId}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await carregarParceiros();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>Nenhum parceiro encontrado</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(tabs)/marketplace/${item.parceiroId}`)}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <Text style={styles.nome}>{item.nome}</Text>
                <Text style={styles.servico}>{item.servico}</Text>
              </View>
              <View style={styles.rating}>
                <Text style={styles.ratingText}>⭐ {item.rating}</Text>
                <Text style={styles.reviewCount}>({item.reviewCount})</Text>
              </View>
            </View>

            <Text style={styles.descricao} numberOfLines={2}>
              {item.descricao}
            </Text>

            {item.distanciaKm !== undefined && (
              <Text style={styles.distancia}>📍 {item.distanciaKm.toFixed(1)} km</Text>
            )}
          </TouchableOpacity>
        )}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", paddingTop: 56 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  error: { color: "#dc2626", fontSize: 14, marginHorizontal: 16, marginBottom: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchSection: { paddingHorizontal: 16, paddingVertical: 12 },
  searchInput: { borderRadius: 12, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: "#e5e7eb" },
  servicosContainer: { maxHeight: 50, paddingVertical: 8 },
  servicosScroll: { paddingHorizontal: 16, gap: 8 },
  servicoTag: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: "#e5e7eb" },
  servicoTagActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  servicoTagText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  servicoTagTextActive: { color: "#fff" },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#9ca3af", fontSize: 14 },
  card: { backgroundColor: "#fff", marginHorizontal: 12, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  cardInfo: { flex: 1, gap: 4 },
  nome: { fontSize: 16, fontWeight: "600", color: "#111827" },
  servico: { fontSize: 12, color: "#16a34a", fontWeight: "600" },
  rating: { alignItems: "flex-end" },
  ratingText: { fontSize: 13, fontWeight: "700", color: "#111827" },
  reviewCount: { fontSize: 11, color: "#6b7280" },
  descricao: { fontSize: 13, color: "#6b7280", lineHeight: 18, marginBottom: 8 },
  distancia: { fontSize: 12, color: "#2563eb", fontWeight: "600" },
});
