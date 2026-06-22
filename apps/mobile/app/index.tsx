import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Linking, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");
const WA = "5511993455589";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.root}>
      {/* Grid lines decorativas */}
      <View style={s.grid} pointerEvents="none">
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={`h${i}`} style={[s.gridLine, s.gridH, { top: i * 64 }]} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={`v${i}`} style={[s.gridLine, s.gridV, { left: i * 64 }]} />
        ))}
      </View>

      <View style={s.inner}>
        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoIcon}>
            {[0,1,2,3,4,5,6,7,8].map(i => (
              <View key={i} style={[s.logoCell, [1,3,5,7].includes(i) && s.logoCellEmpty]} />
            ))}
          </View>
          <Text style={s.logoText}>IMOBI</Text>
        </View>

        {/* Badge */}
        <View style={s.badge}>
          <View style={s.badgeDot} />
          <Text style={s.badgeText}>Crédito desburocratizado · aprovação ágil</Text>
        </View>

        {/* Headline */}
        <Text style={s.h1}>
          <Text style={s.h1White}>CAPITAL{"\n"}PARA SUA{"\n"}</Text>
          <Text style={s.h1Mint}>OBRA.</Text>
        </Text>

        {/* Sub */}
        <Text style={s.sub}>
          Crédito ágil e desburocratizado. Documentação simplificada, versatilidade de modalidades e aprovação em tempo recorde.
        </Text>

        {/* CTAs */}
        <View style={s.actions}>
          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() =>
              Linking.openURL(`https://wa.me/${WA}?text=Ol%C3%A1!%20Gostaria%20de%20solicitar%20uma%20an%C3%A1lise%20de%20cr%C3%A9dito%20pela%20IMOBI.`)
            }
            activeOpacity={0.85}
          >
            <Text style={s.btnPrimaryText}>Solicitar análise gratuita</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.btnGhost}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.7}
          >
            <Text style={s.btnGhostText}>Entrar na plataforma →</Text>
          </TouchableOpacity>
        </View>

        {/* Credibility strip */}
        <View style={s.strip}>
          {[
            ["Rápido", "aprovação recorde"],
            ["Simples", "doc. simplificada"],
            ["Versátil", "modalidades"],
            ["Próprio", "garantias caso a caso"],
          ].map(([val, lbl], i) => (
            <View key={lbl} style={[s.stripItem, i % 2 === 0 && s.stripItemLeft, i % 2 === 1 && s.stripItemRight]}>
              <Text style={s.stripVal}>{val}</Text>
              <Text style={s.stripLbl}>{lbl}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const NAVY  = "#0C1A3D";
const MINT  = "#4ADE80";
const WHITE = "#FFFFFF";

const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: NAVY,
  },
  grid: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
  },
  gridLine: {
    position: "absolute", opacity: 0.04, backgroundColor: WHITE,
  },
  gridH: { left: 0, right: 0, height: 1 },
  gridV: { top: 0, bottom: 0, width: 1 },

  inner: {
    flex: 1, paddingHorizontal: 28, paddingTop: 40, paddingBottom: 32,
    justifyContent: "center",
  },

  /* Logo */
  logoRow: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 44,
  },
  logoIcon: {
    width: 30, height: 30, borderWidth: 2, borderColor: MINT, borderRadius: 6,
    flexDirection: "row", flexWrap: "wrap", padding: 3, gap: 2,
  },
  logoCell: {
    width: 6, height: 6, borderRadius: 1, backgroundColor: MINT,
  },
  logoCellEmpty: {
    backgroundColor: "transparent",
  },
  logoText: {
    fontFamily: "System", fontSize: 18, fontWeight: "800",
    color: WHITE, letterSpacing: 2,
  },

  /* Badge */
  badge: {
    flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 24,
  },
  badgeDot: {
    width: 5, height: 5, borderRadius: 3, backgroundColor: MINT,
  },
  badgeText: {
    color: "rgba(255,255,255,0.65)", fontSize: 9, fontWeight: "600", letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  /* Headline */
  h1: {
    fontSize: Math.min(width * 0.175, 72),
    lineHeight: Math.min(width * 0.175, 72) * 0.92,
    fontWeight: "900", letterSpacing: -1, marginBottom: 20,
  },
  h1White: { color: WHITE },
  h1Mint:  { color: MINT },

  /* Sub */
  sub: {
    fontSize: 15, color: "rgba(255,255,255,0.58)", lineHeight: 24,
    fontWeight: "300", marginBottom: 32, maxWidth: 320,
  },

  /* CTAs */
  actions: { gap: 12, marginBottom: 36 },
  btnPrimary: {
    backgroundColor: MINT, borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 24, alignItems: "center",
  },
  btnPrimaryText: {
    color: "#0F172A", fontSize: 15, fontWeight: "700", letterSpacing: 0.2,
  },
  btnGhost: {
    alignItems: "center", paddingVertical: 10,
  },
  btnGhostText: {
    color: "rgba(255,255,255,0.52)", fontSize: 14, fontWeight: "500",
  },

  /* Strip */
  strip: {
    flexDirection: "row", flexWrap: "wrap",
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 20, gap: 10,
  },
  stripItem: {
    width: "47%", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 8,
  },
  stripItemLeft: {},
  stripItemRight: {},
  stripVal: {
    color: WHITE, fontSize: 22, fontWeight: "800", letterSpacing: -0.5,
  },
  stripLbl: {
    color: "rgba(255,255,255,0.45)", fontSize: 8.5, fontWeight: "600",
    letterSpacing: 0.6, textTransform: "uppercase", textAlign: "center",
  },
});
