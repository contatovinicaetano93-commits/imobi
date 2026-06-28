import { BarChart3 } from "lucide-react";
import type { DashboardTabConfig } from "@/components/dashboard/DashboardPanelShell";
import { JORNADA_PANEL_ID } from "@/components/dashboard/PanelToolbar";

export function buildGestorTabs(mvpMode: boolean): DashboardTabConfig[] {
  const panels = mvpMode
    ? [{ id: JORNADA_PANEL_ID, priority: "primary" as const }, { id: "resumo-kpis", priority: "primary" as const }]
    : [{ id: "resumo-kpis", priority: "primary" as const }];

  return [
    {
      id: "indicadores",
      label: "Indicadores",
      icon: BarChart3,
      panels,
    },
  ];
}
