import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";

const KYC_TIPOS = [
  { id: "RG", label: "Documento de Identidade (RG)", icon: "🪪", descricao: "Frente e verso" },
  { id: "CPF", label: "CPF", icon: "📋", descricao: "Documento do CPF" },
  { id: "CARTEIRA_MOTORISTA", label: "Carteira de Motorista", icon: "🚗", descricao: "CNH válida" },
  { id: "PASSPORT", label: "Passaporte", icon: "🛂", descricao: "Passaporte válido" },
  { id: "COMPROVANTE_ENDERECO", label: "Comprovante de Endereço", icon: "🏠", descricao: "Conta de água, luz ou telefone" },
];

export default function NovoDocumentoScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleSelect = (tipoId: string) => {
    setSelectedType(tipoId);
    // Navigate to upload screen
    router.push({
      pathname: "/kyc/[id]/upload",
      params: { id: `novo-${tipoId}`, tipo: tipoId },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Enviar Novo Documento</Text>
        <Text style={styles.subtitle}>
          Selecione o tipo de documento que deseja enviar
        </Text>

        <View style={styles.listContainer}>
          {KYC_TIPOS.map((tipo) => (
            <TouchableOpacity
              key={tipo.id}
              style={[
                styles.tipoCard,
                selectedType === tipo.id && styles.tipoCardSelected,
              ]}
              onPress={() => handleSelect(tipo.id)}
            >
              <Text style={styles.tipoIcon}>{tipo.icon}</Text>
              <View style={styles.tipoContent}>
                <Text style={styles.tipoLabel}>{tipo.label}</Text>
                <Text style={styles.tipoDescricao}>{tipo.descricao}</Text>
              </View>
              <Text style={styles.tipoArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Requisitos:</Text>
          <Text style={styles.infoItem}>• Documentos devem estar legíveis</Text>
          <Text style={styles.infoItem}>• Formato: PNG, JPG ou PDF</Text>
          <Text style={styles.infoItem}>• Tamanho máximo: 10 MB</Text>
          <Text style={styles.infoItem}>• Documento deve estar inteiramente visível</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    paddingVertical: 12,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
    lineHeight: 20,
  },
  listContainer: {
    marginBottom: 24,
  },
  tipoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  tipoCardSelected: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  tipoIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  tipoContent: {
    flex: 1,
  },
  tipoLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  tipoDescricao: {
    fontSize: 13,
    color: "#9ca3af",
  },
  tipoArrow: {
    fontSize: 20,
    color: "#16a34a",
    marginLeft: 8,
  },
  infoBox: {
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#047857",
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 13,
    color: "#059669",
    marginBottom: 4,
    lineHeight: 18,
  },
});
