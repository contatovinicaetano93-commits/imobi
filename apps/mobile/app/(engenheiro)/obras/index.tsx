import { View, Text, StyleSheet } from "react-native";

export default function ObrasEngenheiroScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Minhas Obras</Text>
      <Text style={s.sub}>Em breve: obras atribuídas ao engenheiro</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  title: { fontSize: 22, fontWeight: "700", color: "#1e3a5f" },
  sub: { marginTop: 8, fontSize: 14, color: "#6b7280", textAlign: "center", paddingHorizontal: 32 },
});
