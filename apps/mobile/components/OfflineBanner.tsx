import { View, Text, StyleSheet } from "react-native";

export function OfflineBanner() {
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.text}>Sem conexão — dados podem estar desatualizados</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#fef3c7",
    borderBottomWidth: 1,
    borderBottomColor: "#fcd34d",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    color: "#92400e",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
