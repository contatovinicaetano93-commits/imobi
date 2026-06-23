import { fluxoApi, type FluxoStatus, type RequisitosObra } from "@/lib/api";
import { TOMADOR_ROUTES } from "@/lib/tomador-flow";

export type { FluxoStatus, RequisitosObra };

export async function loadFluxoStatus(): Promise<FluxoStatus | null> {
  try {
    return await fluxoApi.status();
  } catch {
    return null;
  }
}

export function kycUsuarioBloqueado(status: FluxoStatus | null): boolean {
  return status !== null && !status.kycUsuarioCompleto;
}

export function proximoPassoFluxo(status: FluxoStatus | null): {
  href: string;
  label: string;
  mensagem: string;
} | null {
  if (!status) return null;
  if (!status.kycUsuarioCompleto) {
    return {
      href: TOMADOR_ROUTES.documentos,
      label: "Completar KYC",
      mensagem: "Envie seus documentos de identidade antes de cadastrar obras ou solicitar crédito.",
    };
  }
  return null;
}

export function proximoPassoObra(req: RequisitosObra | null, obraId: string): {
  href: string;
  label: string;
  mensagem: string;
} | null {
  if (!req) return null;
  if (!req.kycUsuarioOk) {
    return {
      href: TOMADOR_ROUTES.documentos,
      label: "KYC",
      mensagem: "Complete a verificação de identidade.",
    };
  }
  if (!req.kycObraOk) {
    return {
      href: `/dashboard/obras/${obraId}?tab=documentos`,
      label: "Documentos da obra",
      mensagem: `Envie ao menos ${req.docsObraMinimo} documentos desta obra (ART, alvará, matrícula).`,
    };
  }
  if (!req.comiteOk && !req.comitePendente) {
    return {
      href: `/dashboard/comite/solicitar?obraId=${obraId}`,
      label: "Comitê",
      mensagem: "Solicite aprovação do comitê digital para esta obra.",
    };
  }
  if (req.comitePendente) {
    return {
      href: "/dashboard/comite",
      label: "Comitê",
      mensagem: "Aguardando decisão do comitê para esta obra.",
    };
  }
  return null;
}
