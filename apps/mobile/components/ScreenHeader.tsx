import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  dark?: boolean;
  accent?: string;
};

export default function ScreenHeader({ title, subtitle, onBack, right, dark, accent }: Props) {
  const router = useRouter();
  const goBack = onBack ?? (() => router.canGoBack() ? router.back() : router.replace("/(tabs)/obras"));

  return (
    <View style={[styles.wrap, dark && { ...styles.wrapDark, backgroundColor: accent ?? "#1B4FD8" }]}>
      <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color={dark ? "#fff" : "#0F172A"} />
      </TouchableOpacity>
      <View style={styles.center}>
        <Text style={[styles.title, dark && styles.titleDark]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.sub, dark && styles.subDark]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.right}>{right ?? <View style={{ width: 40 }} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingBottom: 14,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  wrapDark: { backgroundColor: "#1B4FD8", borderBottomColor: "transparent" },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  center: { flex: 1, alignItems: "center" },
  title: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  titleDark: { color: "#fff" },
  sub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  subDark: { color: "rgba(255,255,255,0.75)" },
  right: { width: 40, alignItems: "flex-end" },
});
