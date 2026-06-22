import { fluxoApi, type FluxoStatus, type RequisitosObra } from "./api";

export type { FluxoStatus, RequisitosObra };

export async function loadFluxoStatus(): Promise<FluxoStatus | null> {
  try {
    return await fluxoApi.status();
  } catch {
    return null;
  }
}

export function proximoPassoFluxo(status: FluxoStatus | null): {
  route: string;
  label: string;
  mensagem: string;
} | null {
  if (!status) return null;
  if (!status.kycUsuarioCompleto) {
    return {
      route: "/(tabs)/documentos",
      label: "Completar KYC",
      mensagem: "Verifique sua identidade para acessar crédito e cadastrar obras.",
    };
  }
  return null;
}

export function proximoPassoObra(req: RequisitosObra | null, obraId: string): {
  route: string;
  label: string;
  mensagem: string;
} | null {
  if (!req) return null;
  if (!req.kycUsuarioOk) {
    return {
      route: "/(tabs)/documentos",
      label: "KYC",
      mensagem: "Complete a verificação de identidade.",
    };
  }
  if (!req.kycObraOk) {
    return {
      route: "/(tabs)/documentos",
      label: "Documentos",
      mensagem: `Envie ao menos ${req.docsObraMinimo} documentos desta obra (ART, alvará, matrícula).`,
    };
  }
  if (!req.comiteOk && !req.comitePendente) {
    return {
      route: "/(tabs)/credito",
      label: "Comitê",
      mensagem: "Solicite aprovação do comitê digital para esta obra.",
    };
  }
  if (req.comitePendente) {
    return {
      route: "/(tabs)/credito",
      label: "Comitê",
      mensagem: "Aguardando decisão do comitê para esta obra.",
    };
  }
  return null;
}
