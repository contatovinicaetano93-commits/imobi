import { StyleSheet } from "react-native";
import { colors, spacing, radii, fontSizes, fontWeights, shadows, brand } from "../tokens";

export * from "../tokens";

export const base = StyleSheet.create({
  // Layout
  flex1:          { flex: 1 },
  row:            { flexDirection: "row" },
  center:         { justifyContent: "center", alignItems: "center" },
  spaceBetween:   { justifyContent: "space-between" },

  // Page
  page:           { flex: 1, backgroundColor: brand.bgPage },
  pageContent:    { padding: spacing[4], paddingTop: spacing[14], paddingBottom: spacing[10] },

  // Cards
  card:           { backgroundColor: brand.bgCard, borderRadius: radii.xl, padding: spacing[4], ...shadows.md },
  cardLg:         { backgroundColor: brand.bgCard, borderRadius: radii["2xl"], padding: spacing[5], ...shadows.md },

  // Typography
  h1:             { fontSize: fontSizes["3xl"], fontWeight: fontWeights.bold, color: brand.text },
  h2:             { fontSize: fontSizes["2xl"], fontWeight: fontWeights.bold, color: brand.text },
  h3:             { fontSize: fontSizes.xl, fontWeight: fontWeights.semibold, color: brand.text },
  body:           { fontSize: fontSizes.base, color: brand.text },
  caption:        { fontSize: fontSizes.sm, color: brand.textMuted },
  label:          { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.gray[700] },

  // Buttons
  btn:            { backgroundColor: brand.primary, borderRadius: radii.lg, padding: spacing[4], alignItems: "center" as const },
  btnText:        { color: colors.white, fontSize: fontSizes.lg, fontWeight: fontWeights.bold },
  btnDisabled:    { opacity: 0.4 },
  btnDanger:      { backgroundColor: brand.danger, borderRadius: radii.lg, padding: spacing[4], alignItems: "center" as const },

  // Inputs
  input:          { backgroundColor: brand.bgCard, borderWidth: 1.5, borderColor: brand.border, borderRadius: radii.lg, padding: spacing[4], fontSize: fontSizes.md, color: brand.text },
  inputError:     { borderColor: brand.danger },

  // Badges
  badge:          { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radii.full },
  badgeSuccess:   { backgroundColor: colors.primary[100] },
  badgeWarning:   { backgroundColor: colors.yellow[100] },
  badgeDanger:    { backgroundColor: colors.red[100] },
  badgeNeutral:   { backgroundColor: colors.gray[100] },
  badgeTextSuccess: { color: colors.primary[800], fontSize: fontSizes.xs, fontWeight: fontWeights.semibold },
  badgeTextWarning: { color: colors.yellow[800], fontSize: fontSizes.xs, fontWeight: fontWeights.semibold },
  badgeTextDanger:  { color: colors.red[800], fontSize: fontSizes.xs, fontWeight: fontWeights.semibold },
  badgeTextNeutral: { color: colors.gray[500], fontSize: fontSizes.xs, fontWeight: fontWeights.semibold },

  // Dividers
  divider:        { height: 1, backgroundColor: brand.border },
});
