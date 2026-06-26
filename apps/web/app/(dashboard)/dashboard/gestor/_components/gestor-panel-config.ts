import { ShieldCheck, Zap } from "lucide-react";
import type { DashboardTabConfig } from "@/components/dashboard/DashboardPanelShell";
import { JORNADA_PANEL_ID } from "@/components/dashboard/PanelToolbar";

export function buildGestorTabs(mvpMode: boolean): DashboardTabConfig[] {
  const operacoesPanels = mvpMode
    ? [{ id: JORNADA_PANEL_ID, priority: "primary" as const }, { id: "resumo-fila", priority: "primary" as const }]
    : [{ id: "resumo-fila", priority: "primary" as const }];

  return [
    {
      id: "operacoes",
      label: "Operações",
      icon: ShieldCheck,
      panels: operacoesPanels,
    },
    {
      id: "acoes",
      label: "Ações",
      icon: Zap,
      panels: [
        { id: "acoes-rapidas", priority: "primary" },
        { id: "dicas", priority: "secondary" },
      ],
    },
  ];
}
