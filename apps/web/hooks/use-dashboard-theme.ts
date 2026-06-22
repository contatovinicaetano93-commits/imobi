"use client";

import { useCallback, useEffect, useState } from "react";

export type DashboardTheme = "light" | "dark";

const STORAGE_KEY = "imobi_dash_theme";

export function useDashboardTheme() {
  const [theme, setThemeState] = useState<DashboardTheme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as DashboardTheme | null;
      if (stored === "light" || stored === "dark") setThemeState(stored);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setTheme = useCallback((next: DashboardTheme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [setTheme, theme]);

  return { theme, setTheme, toggleTheme, ready };
}
