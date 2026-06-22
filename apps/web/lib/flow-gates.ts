import { fluxoApi, type FluxoStatus, type RequisitosObra } from "@/lib/api";

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
      href: "/dashboard/kyc",
      label: "Completar KYC",
      mensagem: "Verifique sua identidade para acessar crédito e cadastrar obras.",
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
      href: "/dashboard/kyc",
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
