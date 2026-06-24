import type { PanelPriority } from "@/lib/use-panel-state";

export type AdminPanelDef = { id: string; priority: PanelPriority };

export const ADMIN_GLOBAL_PANELS: AdminPanelDef[] = [
  { id: "acesso-paineis", priority: "primary" },
];

export const ADMIN_TAB_PANELS: Record<string, AdminPanelDef[]> = {
  portfolio: [
    { id: "admin-carteira", priority: "primary" },
    { id: "admin-portfolio-kpis", priority: "primary" },
    { id: "admin-receita", priority: "primary" },
    { id: "admin-ebitda", priority: "secondary" },
  ],
  risco: [
    { id: "admin-risco-kpis", priority: "primary" },
    { id: "admin-inadimplencia", priority: "primary" },
    { id: "admin-concentracao", priority: "primary" },
    { id: "admin-alertas-risco", priority: "secondary" },
  ],
  pipeline: [
    { id: "admin-pipeline-kpis", priority: "primary" },
    { id: "admin-funil", priority: "primary" },
    { id: "admin-incorporadoras", priority: "secondary" },
  ],
  obras: [
    { id: "admin-obras-cta", priority: "primary" },
    { id: "admin-obras-kpis", priority: "primary" },
    { id: "admin-obras-tabela", priority: "primary" },
    { id: "admin-cronograma", priority: "secondary" },
  ],
  operacional: [
    { id: "admin-sipoc", priority: "critical" },
    { id: "admin-aprovacoes", priority: "critical" },
    { id: "admin-kyc", priority: "primary" },
    { id: "admin-documentos", priority: "primary" },
    { id: "admin-auditoria", priority: "secondary" },
    { id: "admin-logs", priority: "secondary" },
    { id: "admin-obras-recentes", priority: "primary" },
    { id: "admin-atividades", priority: "secondary" },
    { id: "admin-credenciais", priority: "secondary" },
  ],
};
