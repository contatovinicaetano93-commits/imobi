import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function CreditoScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Crédito</Text>
      <Text style={styles.subtitle}>Simule e solicite crédito para sua obra</Text>

      {/* Card destacado */}
      <View style={styles.mainCard}>
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>💰</Text>
        </View>
        <Text style={styles.cardTitle}>Simulador de Crédito</Text>
        <Text style={styles.cardDescription}>
          Descubra quanto você pode pedir emprestado e veja o cronograma de pagamento
        </Text>
        <TouchableOpacity
          style={styles.cardButton}
          onPress={() => router.push("/credito/simular")}
        >
          <Text style={styles.cardButtonText}>Ir para Simulador →</Text>
        </TouchableOpacity>
      </View>

      {/* Benefícios */}
      <View style={styles.benefitsContainer}>
        <Text style={styles.benefitsTitle}>Vantagens</Text>
        <BenefitItem icon="✓" text="Taxa de juros competitiva" />
        <BenefitItem icon="✓" text="Liberação rápida do crédito" />
        <BenefitItem icon="✓" text="Flexibilidade de prazo" />
        <BenefitItem icon="✓" text="Sem taxas escondidas" />
      </View>

      {/* Como funciona */}
      <View style={styles.howItWorksContainer}>
        <Text style={styles.howItWorksTitle}>Como funciona</Text>
        <StepItem number="1" title="Simule" description="Use a calculadora para ver as opções" />
        <StepItem number="2" title="Solicite" description="Envie sua solicitação de crédito" />
        <StepItem number="3" title="Aprove" description="Análise rápida em 24-48h" />
        <StepItem number="4" title="Receba" description="Crédito em sua conta em até 5 dias" />
      </View>
    </ScrollView>
  );
}

function BenefitItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.benefitIcon}>
        <Text style={styles.benefitIconText}>{icon}</Text>
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function StepItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingTop: 20, paddingBottom: 40, gap: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 8 },
  mainCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#dcfce7",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  cardIconText: { fontSize: 48 },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8, textAlign: "center" },
  cardDescription: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  cardButton: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cardButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  benefitsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  benefitsTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 12 },
  benefitItem: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  benefitIconText: { fontSize: 12, color: "#16a34a", fontWeight: "700" },
  benefitText: { fontSize: 13, color: "#374151", flex: 1 },
  howItWorksContainer: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
  },
  howItWorksTitle: { fontSize: 16, fontWeight: "600", color: "#047857", marginBottom: 12 },
  stepItem: { flexDirection: "row", marginBottom: 12 },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepNumberText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 13, fontWeight: "600", color: "#111827", marginBottom: 2 },
  stepDescription: { fontSize: 12, color: "#6b7280" },
});
