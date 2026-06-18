export const colors = {
  primary: {
    50:  "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
  },
  gray: {
    50:  "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
  red: {
    50:  "#fef2f2",
    100: "#fee2e2",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
  },
  yellow: {
    50:  "#fefce8",
    100: "#fef9c3",
    500: "#eab308",
    600: "#ca8a04",
    700: "#a16207",
    800: "#92400e",
  },
  blue: {
    50:  "#eff6ff",
    100: "#dbeafe",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
  },
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
} as const;

export const spacing = {
  0:   0,
  1:   4,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  10:  40,
  12:  48,
  14:  56,
  16:  64,
  20:  80,
} as const;

export const radii = {
  sm:   8,
  md:   12,
  lg:   14,
  xl:   16,
  "2xl": 20,
  full: 9999,
} as const;

export const fontSizes = {
  xs:   11,
  sm:   12,
  base: 14,
  md:   15,
  lg:   16,
  xl:   18,
  "2xl": 20,
  "3xl": 22,
  "4xl": 24,
  "5xl": 28,
  "6xl": 32,
  "7xl": 44,
  "8xl": 48,
} as const;

export const fontWeights = {
  normal:    "400",
  medium:    "500",
  semibold:  "600",
  bold:      "700",
  extrabold: "800",
} as const;

export const lineHeights = {
  tight:   18,
  snug:    20,
  normal:  22,
  relaxed: 24,
  loose:   28,
} as const;

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

export const brand = {
  primary:   colors.primary[600],
  primaryBg: colors.primary[50],
  danger:    colors.red[600],
  warning:   colors.yellow[600],
  info:      colors.blue[600],
  bgPage:    colors.gray[50],
  bgCard:    colors.white,
  text:      colors.gray[900],
  textMuted: colors.gray[500],
  border:    colors.gray[200],
} as const;
