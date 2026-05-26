import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "@imbobi/core";

type ParceiroPerfil = {
  parceiroId: string;
  nome: string;
  servico: string;
  descricao: string;
  bio: string;
  rating: number;
  reviewCount: number;
  telefone: string;
  email: string;
  latitude: number;
  longitude: number;
  experiencia: string;
  certificacoes: string[];
  fotos?: string[];
  disponivel: boolean;
};

type Review = {
  reviewId: string;
  usuario: string;
  rating: number;
  comentario: string;
  data: string;
};

export default function MarketplaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [parceiro, setParceiro] = useState<ParceiroPerfil | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const carregarParceiro = async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        if (!token) throw new Error("Não autenticado");

        const data = await apiClient.get<ParceiroPerfil>(`/api/v1/parceiros/${id}`, token);
        setParceiro(data);

        const reviewsData = await apiClient.get<Review[]>(`/api/v1/parceiros/${id}/reviews`, token);
        setReviews(reviewsData);
      } catch (e: any) {
        setError(e.message ?? "Erro ao carregar parceiro");
      } finally {
        setLoading(false);
      }
    };

    carregarParceiro();
  }, [id]);

  const handleMarcarVistoria = async () => {
    if (!parceiro) return;

    Alert.alert("Agendar vistoria", "Deseja solicitar uma vistoria com este parceiro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sim, agendar",
        onPress: async () => {
          setBookingLoading(true);
          try {
            const token = await SecureStore.getItemAsync("accessToken");
            if (!token) throw new Error("Não autenticado");

            await apiClient.post(
              `/api/v1/vistorias`,
              { parceiroId: parceiro.parceiroId },
              token
            );

            Alert.alert(
              "Sucesso",
              "Vistoria solicitada! O parceiro entrará em contato em breve.",
              [{ text: "OK", onPress: () => router.back() }]
            );
          } catch (e: any) {
            Alert.alert("Erro", e.message ?? "Erro ao agendar vistoria");
          } finally {
            setBookingLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (error || !parceiro) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Parceiro não encontrado"}</Text>
      </View>
    );
  }

  const mediaRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : parceiro.rating.toFixed(1);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View>
          <Text style={styles.nome}>{parceiro.nome}</Text>
          <Text style={styles.servico}>{parceiro.servico}</Text>
        </View>
        <View style={styles.ratingBox}>
          <Text style={styles.ratingBig}>⭐ {mediaRating}</Text>
          <Text style={styles.reviewCount}>({reviews.length} avaliações)</Text>
        </View>
      </View>

      <Text style={styles.bio}>{parceiro.bio}</Text>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Status</Text>
        <View style={[styles.statusBadge, parceiro.disponivel ? styles.statusDisponivelBg : styles.statusIndisponivelBg]}>
          <Text style={[styles.statusText, parceiro.disponivel ? styles.statusDisponivelText : styles.statusIndisponivelText]}>
            {parceiro.disponivel ? "Disponível" : "Indisponível"}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contato</Text>
        <InfoRow label="Telefone" value={parceiro.telefone} />
        <InfoRow label="E-mail" value={parceiro.email} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre</Text>
        <Text style={styles.descricao}>{parceiro.descricao}</Text>
        <Text style={styles.experienciaLabel}>Experiência</Text>
        <Text style={styles.experiencia}>{parceiro.experiencia}</Text>
      </View>

      {parceiro.certificacoes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certificações</Text>
          <View style={styles.certificacoesList}>
            {parceiro.certificacoes.map((cert, idx) => (
              <View key={idx} style={styles.certificacao}>
                <Text style={styles.certificacaoIcon}>✓</Text>
                <Text style={styles.certificacaoText}>{cert}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {reviews.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avaliações</Text>
          {reviews.slice(0, 3).map((review) => (
            <View key={review.reviewId} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewUsuario}>{review.usuario}</Text>
                <Text style={styles.reviewRating}>⭐ {review.rating}</Text>
              </View>
              <Text style={styles.reviewComentario}>{review.comentario}</Text>
              <Text style={styles.reviewData}>{new Date(review.data).toLocaleDateString("pt-BR")}</Text>
            </View>
          ))}
          {reviews.length > 3 && (
            <TouchableOpacity>
              <Text style={styles.verMaisReviews}>Ver todas as {reviews.length} avaliações</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.agendarBtn, !parceiro.disponivel && styles.agendarBtnDisabled]}
        onPress={handleMarcarVistoria}
        disabled={!parceiro.disponivel || bookingLoading}
      >
        <Text style={styles.agendarBtnText}>
          {bookingLoading ? "Agendando..." : "Agendar Vistoria"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "#dc2626", fontSize: 14 },
  back: { marginBottom: 16 },
  backText: { color: "#2563eb", fontSize: 15, fontWeight: "600" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  nome: { fontSize: 22, fontWeight: "700", color: "#111827" },
  servico: { fontSize: 13, color: "#16a34a", fontWeight: "600", marginTop: 4 },
  ratingBox: { alignItems: "flex-end" },
  ratingBig: { fontSize: 18, fontWeight: "700", color: "#111827" },
  reviewCount: { fontSize: 12, color: "#6b7280" },
  bio: { fontSize: 14, color: "#6b7280", lineHeight: 20, marginBottom: 16 },
  statusCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  statusLabel: { fontSize: 14, fontWeight: "600", color: "#111827" },
  statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  statusDisponivelBg: { backgroundColor: "#dcfce7" },
  statusIndisponivelBg: { backgroundColor: "#fee2e2" },
  statusText: { fontSize: 12, fontWeight: "600" },
  statusDisponivelText: { color: "#166534" },
  statusIndisponivelText: { color: "#991b1b" },
  section: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  infoLabel: { fontSize: 13, color: "#6b7280" },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#111827" },
  descricao: { fontSize: 13, color: "#6b7280", lineHeight: 20, marginBottom: 12 },
  experienciaLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginTop: 12 },
  experiencia: { fontSize: 13, color: "#111827", lineHeight: 20 },
  certificacoesList: { gap: 8 },
  certificacao: { flexDirection: "row", alignItems: "center", gap: 8 },
  certificacaoIcon: { fontSize: 14, color: "#16a34a", fontWeight: "700" },
  certificacaoText: { fontSize: 13, color: "#111827", flex: 1 },
  reviewCard: { backgroundColor: "#f9fafb", borderRadius: 10, padding: 12, marginBottom: 10 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  reviewUsuario: { fontSize: 13, fontWeight: "600", color: "#111827" },
  reviewRating: { fontSize: 12, fontWeight: "600" },
  reviewComentario: { fontSize: 12, color: "#6b7280", lineHeight: 18, marginBottom: 6 },
  reviewData: { fontSize: 11, color: "#9ca3af" },
  verMaisReviews: { fontSize: 13, color: "#2563eb", fontWeight: "600", textAlign: "center", paddingVertical: 10 },
  agendarBtn: { backgroundColor: "#16a34a", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 16 },
  agendarBtnDisabled: { opacity: 0.5 },
  agendarBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
