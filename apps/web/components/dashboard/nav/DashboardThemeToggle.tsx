"use client";

import { Moon, Sun } from "lucide-react";
import type { DashboardTheme } from "@/hooks/use-dashboard-theme";

type DashboardThemeToggleProps = {
  theme: DashboardTheme;
  onToggle: () => void;
  variant?: "sidebar" | "header";
};

export function DashboardThemeToggle({ theme, onToggle, variant = "sidebar" }: DashboardThemeToggleProps) {
  const isDark = theme === "dark";
  const label = isDark ? "Modo claro" : "Modo escuro";

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        title={label}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="mx-3 mb-2 flex min-h-[40px] w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-['Jost'] text-[0.72rem] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
      {label}
    </button>
  );
}
