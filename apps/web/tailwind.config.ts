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
        // SOMA — tema dark/dourado (app mobile-first)
        soma: {
          bg: "#0B0B0F",
          surface: "#16161C",
          surface2: "#1E1E26",
          line: "#2A2A33",
          gold: "#E8B84B",
          "gold-hi": "#F5D27E",
          "gold-lo": "#B8891F",
          text: "#F5F5F7",
          muted: "#9A9AA5",
          faint: "#5A5A66",
          gain: "#34D399",
          loss: "#F87171",
          warn: "#F5B544",
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
        "gold-grad": "linear-gradient(135deg, #F5D27E 0%, #E8B84B 45%, #B8891F 100%)",
        "gold-soft": "linear-gradient(180deg, rgba(232,184,75,0.14) 0%, rgba(232,184,75,0.02) 100%)",
      },
      boxShadow: {
        "soma-card": "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        "gold-glow": "0 8px 32px -8px rgba(232,184,75,0.45)",
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
