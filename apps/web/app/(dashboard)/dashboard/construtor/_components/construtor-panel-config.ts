import { CreditCard, Calendar, FileText, Send } from "lucide-react";
import type { DashboardPanelDef, DashboardTabConfig } from "@/components/dashboard/DashboardPanelShell";
import { JORNADA_PANEL_ID } from "@/components/dashboard/PanelToolbar";

type ConstrutorPanelOptions = {
  mvpMode: boolean;
  hasAlertas: boolean;
  hasNotifs: boolean;
  liberacoesPriority: "critical" | "primary";
  kycPriority: "critical" | "primary" | "secondary";
};

export function buildConstrutorTabs(opts: ConstrutorPanelOptions): DashboardTabConfig[] {
  const jornadaPanel: DashboardPanelDef[] = opts.mvpMode
    ? [{ id: JORNADA_PANEL_ID, priority: "primary" }]
    : [];
  const alertasPanel: DashboardPanelDef[] = opts.hasAlertas
    ? [{ id: "alertas", priority: "critical" }]
    : [];
  const notifPanel: DashboardPanelDef[] = opts.hasNotifs
    ? [{ id: "notificacoes", priority: "primary" }]
    : [];

  return [
    {
      id: "operacao",
      label: "Operação",
      icon: CreditCard,
      panels: [
        ...jornadaPanel,
        ...alertasPanel,
        { id: "operacao-ativa", priority: "primary" },
      ],
    },
    {
      id: "cronograma",
      label: "Cronograma",
      icon: Calendar,
      panels: [
        { id: "cronograma-pagamentos", priority: "primary" },
        { id: "cronograma-liberacoes", priority: opts.liberacoesPriority },
        { id: "medicao-obra", priority: "secondary" },
      ],
    },
    {
      id: "documentos",
      label: "Documentos",
      icon: FileText,
      panels: [
        { id: "documentos-kyc", priority: opts.kycPriority },
        { id: "extrato-operacao", priority: "secondary" },
      ],
    },
    {
      id: "solicitacoes",
      label: "Solicitações",
      icon: Send,
      panels: [
        { id: "solicitacoes", priority: "primary" },
        ...notifPanel,
        { id: "contratos-documentos", priority: "secondary" },
      ],
    },
  ];
}

export function allConstrutorPanels(tabs: DashboardTabConfig[]): DashboardPanelDef[] {
  return tabs.flatMap((t) => t.panels);
}
