import { StyleSheet } from "react-native";

export const authStyles = StyleSheet.create({
  input: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, padding: 14, fontSize: 15, color: "#111827" },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, paddingHorizontal: 14 },
  inputFlex: { flex: 1, paddingVertical: 14, fontSize: 15, color: "#111827" },
  eyeBtn: { padding: 4 },
  inputError: { borderColor: "#ef4444" },
  button: { backgroundColor: "#1d4ed8", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  buttonLoading: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
