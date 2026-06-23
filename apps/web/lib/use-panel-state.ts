"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export type PanelPriority = "critical" | "primary" | "secondary";

const STORAGE_PREFIX = "imobi:panel-state:";
export const PANEL_STATE_EVENT = "imobi:panel-state-changed";

export function defaultOpenForPriority(priority: PanelPriority): boolean {
  return priority !== "secondary";
}

function readPageState(pathname: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + pathname);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writePageState(pathname: string, state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_PREFIX + pathname, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function persistSectionOpen(pathname: string, sectionId: string, open: boolean) {
  const current = readPageState(pathname);
  current[sectionId] = open;
  writePageState(pathname, current);
}

function resolveOpen(
  pathname: string,
  sectionId: string,
  priority: PanelPriority,
  defaultOpenOverride?: boolean,
): boolean {
  const stored = readPageState(pathname);
  if (sectionId in stored) return stored[sectionId]!;
  return defaultOpenOverride ?? defaultOpenForPriority(priority);
}

export function usePanelSection(
  sectionId: string,
  priority: PanelPriority,
  defaultOpenOverride?: boolean,
) {
  const pathname = usePathname() ?? "";
  const fallback = defaultOpenOverride ?? defaultOpenForPriority(priority);
  const [open, setOpen] = useState(fallback);

  const syncFromStorage = useCallback(() => {
    setOpen(resolveOpen(pathname, sectionId, priority, defaultOpenOverride));
  }, [pathname, sectionId, priority, defaultOpenOverride]);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ pathname: string }>).detail;
      if (detail?.pathname === pathname) syncFromStorage();
    };
    window.addEventListener(PANEL_STATE_EVENT, handler);
    return () => window.removeEventListener(PANEL_STATE_EVENT, handler);
  }, [pathname, syncFromStorage]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      persistSectionOpen(pathname, sectionId, next);
      return next;
    });
  }, [pathname, sectionId]);

  const set = useCallback(
    (value: boolean) => {
      setOpen(value);
      persistSectionOpen(pathname, sectionId, value);
    },
    [pathname, sectionId],
  );

  return { open, toggle, set };
}

export function usePanelToolbar(sections: { id: string; priority: PanelPriority }[]) {
  const pathname = usePathname() ?? "";

  const expandAll = useCallback(() => {
    const state = readPageState(pathname);
    for (const s of sections) state[s.id] = true;
    writePageState(pathname, state);
    window.dispatchEvent(new CustomEvent(PANEL_STATE_EVENT, { detail: { pathname } }));
  }, [pathname, sections]);

  const collapseSecondary = useCallback(() => {
    const state = readPageState(pathname);
    for (const s of sections) {
      state[s.id] = s.priority !== "secondary";
    }
    writePageState(pathname, state);
    window.dispatchEvent(new CustomEvent(PANEL_STATE_EVENT, { detail: { pathname } }));
  }, [pathname, sections]);

  return { expandAll, collapseSecondary };
}
