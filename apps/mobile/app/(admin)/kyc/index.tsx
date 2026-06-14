import { View, Text, StyleSheet, StatusBar, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const C = { blue: "#1B4FD8", navy: "#0C1A3D", mint: "#22C55E", red: "#EF4444", ink: "#0F172A", gray: "#64748B", surface: "#F8FAFC", border: "#E2E8F0", white: "#FFFFFF" };

export default function AdminKycScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 24, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: C.white }}>KYC</Text>
        <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>Documentos aguardando aprovação</Text>
      </View>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.surface, gap: 12 }}>
        <Ionicons name="id-card" size={48} color={C.blue} />
        <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink }}>Em desenvolvimento</Text>
        <Text style={{ fontSize: 14, color: C.gray, textAlign: "center", paddingHorizontal: 32 }}>
          A fila de revisão de KYC estará disponível na próxima versão.
        </Text>
      </View>
    </View>
  );
}
