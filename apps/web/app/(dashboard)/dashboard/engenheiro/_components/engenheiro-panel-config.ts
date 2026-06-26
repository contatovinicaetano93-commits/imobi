import { Wrench, CalendarClock, HardHat, ShieldCheck } from "lucide-react";
import type { DashboardTabConfig } from "@/components/dashboard/DashboardPanelShell";

export const ENGENHEIRO_TABS: DashboardTabConfig[] = [
  {
    id: "resumo",
    label: "Resumo",
    icon: Wrench,
    panels: [{ id: "resumo-portal", priority: "primary" }],
  },
  {
    id: "visitas",
    label: "Visitas",
    icon: CalendarClock,
    panels: [{ id: "fila-visitas", priority: "critical" }],
  },
  {
    id: "obras",
    label: "Obras",
    icon: HardHat,
    panels: [
      { id: "obras-responsabilidade", priority: "primary" },
      { id: "etapas-projeto", priority: "secondary" },
    ],
  },
  {
    id: "licencas",
    label: "Licenças",
    icon: ShieldCheck,
    panels: [{ id: "licencas", priority: "primary" }],
  },
];
