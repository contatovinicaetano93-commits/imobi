"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { PanelPriority } from "@/lib/use-panel-state";
import { PanelToolbar } from "@/components/dashboard/PanelToolbar";
import { PanelTabs, type PanelTabDef } from "@/components/dashboard/PanelTabs";
import { PanelStack } from "@/components/dashboard/PanelStack";

export type DashboardPanelDef = { id: string; priority: PanelPriority };

export type DashboardTabConfig = PanelTabDef & {
  panels: DashboardPanelDef[];
};

type DashboardPanelShellProps = {
  globalPanels?: DashboardPanelDef[];
  /** Seções quando não há abas (páginas simples). */
  panels?: DashboardPanelDef[];
  tabs?: DashboardTabConfig[];
  defaultTab?: string;
  /** Conteúdo acima das abas (ex.: acesso rápido, jornada). */
  beforeTabs?: ReactNode;
  /** Conteúdo por aba — chave = tab.id. Sem abas, use `content`. */
  tabContent?: Record<string, ReactNode>;
  /** Conteúdo único quando não há abas. */
  content?: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
};

const MAX_WIDTH: Record<NonNullable<DashboardPanelShellProps["maxWidth"]>, string> = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-[1100px]",
  full: "max-w-none",
};

export function DashboardPanelShell({
  globalPanels = [],
  panels = [],
  tabs = [],
  defaultTab,
  beforeTabs,
  tabContent,
  content,
  className = "",
  maxWidth = "full",
}: DashboardPanelShellProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? "");

  const toolbarSections = useMemo(() => {
    if (tabs.length > 0) {
      const tabPanels = tabs.find((t) => t.id === activeTab)?.panels ?? [];
      return [...globalPanels, ...tabPanels];
    }
    return [...globalPanels, ...panels];
  }, [globalPanels, panels, tabs, activeTab]);

  const activeContent = tabs.length > 0 ? tabContent?.[activeTab] : content;

  return (
    <div className={`flex flex-col gap-4 pb-8 p-4 sm:p-6 ${MAX_WIDTH[maxWidth]} ${className}`}>
      <PanelToolbar sections={toolbarSections} />

      {beforeTabs}

      {tabs.length > 0 && (
        <PanelTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      )}

      {activeContent && <PanelStack>{activeContent}</PanelStack>}
    </div>
  );
}
