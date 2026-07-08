/**
 * Tokens visuais canônicos do Imobi — não alterar sem alinhamento de marca.
 * Padrões UX inspirados em apps fintech mobile; paleta e tipografia Imobi.
 */

export const IMOBI = {
  navy: "#0C1A3D",
  royal: "#1B4FD8",
  mint: "#4ADE80",
  mintDark: "#22C55E",
  canvas: "#EEF3FF",
  surface: "#FFFFFF",
  ink: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  gain: "#16A34A",
  loss: "#DC2626",
  warn: "#D97706",
} as const;

/** Rótulos curtos para bottom tab nav (mobile). */
export const MOBILE_TAB_SHORT: Record<string, string> = {
  "/dashboard/construtor": "Início",
  "/dashboard/kyc": "Documentos",
  "/dashboard/proposta-credito": "Viabilidade",
  "/dashboard/operacao": "Operação",
  "/dashboard/gestor": "Painel",
  "/dashboard/engenheiro/vistoria": "Vistorias",
  "/dashboard/engenheiro/comite": "Comitê",
  "/dashboard/admin": "Admin",
  "/dashboard/admin/usuarios": "Usuários",
  "/dashboard/comercial": "Comercial",
  "/dashboard/notificacoes": "Alertas",
  "/dashboard/perfil": "Perfil",
};
