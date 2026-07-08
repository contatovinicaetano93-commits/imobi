import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/web/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        imobi: {
          navy: "#0C1A3D",
          royal: "#1B4FD8",
          mint: "#4ADE80",
          canvas: "#EEF3FF",
          surface: "#FFFFFF",
          ink: "#0F172A",
          muted: "#64748B",
          border: "#E2E8F0",
          gain: "#16A34A",
          loss: "#DC2626",
          warn: "#D97706",
        },
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        accent: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        sans: ["'Jost'", "system-ui", "sans-serif"],
        num: ["'Inter'", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "imobi-chip": "linear-gradient(135deg, #4ADE80 0%, #22C55E 55%, #16A34A 100%)",
      },
      boxShadow: {
        "imobi-card": "0 1px 3px rgba(12,26,61,0.06)",
        "imobi-nav": "0 -4px 24px rgba(12,26,61,0.12)",
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
