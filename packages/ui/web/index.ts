export * from "../tokens";

import { colors, spacing, radii, fontSizes } from "../tokens";

// CSS custom properties string — inject via <style> or a global CSS file
export function generateCssVars(): string {
  const lines: string[] = [":root {"];

  for (const [scale, shades] of Object.entries(colors)) {
    if (typeof shades === "string") {
      lines.push(`  --color-${scale}: ${shades};`);
    } else {
      for (const [shade, value] of Object.entries(shades)) {
        lines.push(`  --color-${scale}-${shade}: ${value};`);
      }
    }
  }

  for (const [key, value] of Object.entries(spacing)) {
    lines.push(`  --spacing-${key}: ${value}px;`);
  }

  for (const [key, value] of Object.entries(radii)) {
    lines.push(`  --radius-${key}: ${value}px;`);
  }

  for (const [key, value] of Object.entries(fontSizes)) {
    lines.push(`  --font-size-${key}: ${value}px;`);
  }

  lines.push("}");
  return lines.join("\n");
}

// Tailwind preset — use in tailwind.config.ts: presets: [imobiTailwindPreset]
export const imobiTailwindPreset = {
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        brand: {
          DEFAULT:  colors.primary[600],
          bg:       colors.primary[50],
          dark:     colors.primary[800],
        },
      },
      borderRadius: {
        sm:   `${radii.sm}px`,
        md:   `${radii.md}px`,
        lg:   `${radii.lg}px`,
        xl:   `${radii.xl}px`,
        "2xl":`${radii["2xl"]}px`,
      },
      spacing: Object.fromEntries(
        Object.entries(spacing).map(([k, v]) => [k, `${v}px`]),
      ),
      fontSize: Object.fromEntries(
        Object.entries(fontSizes).map(([k, v]) => [k, `${v}px`]),
      ),
    },
  },
} as const;
