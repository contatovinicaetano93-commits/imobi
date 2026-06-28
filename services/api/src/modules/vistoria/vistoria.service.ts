import { Injectable } from "@nestjs/common";
import { EtapasService } from "../etapas/etapas.service";

/**
 * Vistoria delegada ao fluxo canônico de etapas (SIPOC: AGUARDANDO_PAGAMENTO → Admin confirma).
 */
@Injectable()
export class VistoriaService {
  constructor(private readonly etapas: EtapasService) {}

  aprovar(gestorId: string, etapaId: string, observacoes?: string) {
    return this.etapas.aprovar(gestorId, etapaId, observacoes);
  }

  rejeitar(gestorId: string, etapaId: string, motivo: string) {
    return this.etapas.rejeitar(gestorId, etapaId, motivo);
  }
}
