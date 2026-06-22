import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth-context";

const TEST_USERS = [
  { label: "Tomador", email: "tomador@imobi.com.br", senha: "Tomador@123" },
  { label: "Admin", email: "admin@imobi.com.br", senha: "Admin@123" },
  { label: "Gestor", email: "gestor@imobi.com.br", senha: "Gestor@123" },
  { label: "Eng", email: "eng@imobi.com.br", senha: "Eng@123" },
];

export default function DevAccountBar() {
  const router = useRouter();
  const { signOut } = useAuth();

  if (!__DEV__) return null;

  const goLogin = async () => {
    await signOut();
  };

  const pickUser = () => {
    Alert.alert(
      "Dev — trocar usuário",
      "Escolha uma conta de teste",
      [
        ...TEST_USERS.map((u) => ({
          text: u.label,
          onPress: async () => {
            await signOut();
            router.replace({ pathname: "/login", params: { email: u.email, senha: u.senha } });
          },
        })),
        { text: "Só abrir login", onPress: goLogin },
        { text: "Cancelar", style: "cancel" },
      ],
    );
  };

  return (
    <View style={styles.bar}>
      <TouchableOpacity style={styles.btn} onPress={goLogin}>
        <Text style={styles.btnText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.btnAlt]} onPress={pickUser}>
        <Text style={styles.btnTextAlt}>Trocar usuário</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingTop: 48,
    backgroundColor: "#0C1A3D",
    borderBottomWidth: 1,
    borderBottomColor: "#4ADE80",
  },
  btn: {
    flex: 1,
    backgroundColor: "#4ADE80",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  btnAlt: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#4ADE80",
  },
  btnText: { color: "#0C1A3D", fontWeight: "800", fontSize: 13 },
  btnTextAlt: { color: "#4ADE80", fontWeight: "700", fontSize: 13 },
});
