import { Star, Link2, Banknote, Users, Mail } from "lucide-react";
import type { DashboardTabConfig } from "@/components/dashboard/DashboardPanelShell";

export const COMERCIAL_TABS: DashboardTabConfig[] = [
  {
    id: "resumo",
    label: "Resumo",
    icon: Star,
    panels: [{ id: "resumo-portal", priority: "primary" }],
  },
  {
    id: "indicacao",
    label: "Indicação",
    icon: Link2,
    panels: [
      { id: "link-indicacao", priority: "primary" },
      { id: "kpis-comissao", priority: "primary" },
    ],
  },
  {
    id: "operacoes",
    label: "Operações",
    icon: Banknote,
    panels: [{ id: "operacoes-indicadas", priority: "primary" }],
  },
  {
    id: "contatos",
    label: "Contatos",
    icon: Mail,
    panels: [
      { id: "mailing-contatos", priority: "secondary" },
      { id: "privacidade", priority: "secondary" },
    ],
  },
];
