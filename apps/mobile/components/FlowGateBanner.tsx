import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  mensagem: string;
  route: string;
  label: string;
  variant?: "warning" | "info";
};

export default function FlowGateBanner({ mensagem, route, label, variant = "warning" }: Props) {
  const router = useRouter();
  const isWarning = variant === "warning";

  return (
    <View style={[styles.box, isWarning ? styles.warning : styles.info]}>
      <View style={styles.row}>
        <Ionicons
          name="alert-circle"
          size={20}
          color={isWarning ? "#d97706" : "#1B4FD8"}
          style={styles.icon}
        />
        <Text style={[styles.text, isWarning ? styles.textWarning : styles.textInfo]}>{mensagem}</Text>
      </View>
      <TouchableOpacity
        style={[styles.btn, isWarning ? styles.btnWarning : styles.btnInfo]}
        onPress={() => router.push(route as never)}
      >
        <Text style={styles.btnText}>{label}</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  warning: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  info: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  icon: { marginTop: 1 },
  text: { flex: 1, fontSize: 13, lineHeight: 18 },
  textWarning: { color: "#92400E" },
  textInfo: { color: "#1E3A8A" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  btnWarning: { backgroundColor: "#D97706" },
  btnInfo: { backgroundColor: "#1B4FD8" },
  btnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
