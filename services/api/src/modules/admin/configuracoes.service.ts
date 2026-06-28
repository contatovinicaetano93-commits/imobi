import { Injectable, Logger } from "@nestjs/common";
import type { ConfiguracaoSistema } from "@prisma/client";
import type { ConfiguracaoSistemaInput } from "@imbobi/schemas";
import { PrismaService } from "../prisma/prisma.service";

const CONFIG_ID = "global";

export const CONFIGURACAO_DEFAULTS: ConfiguracaoSistemaInput = {
  taxaMensalMin: 0.89,
  taxaMensalMax: 2.5,
  taxaPadrao: 1.89,
  valorMinCredito: 50_000,
  valorMaxCredito: 5_000_000,
  prazoMaxMeses: 60,
  raioValidacaoMetrosPadrao: 100,
  toleranciaPrecisaoGps: 20,
  diasAprovacao: 15,
  limiteEvidenciasMB: 10,
  modoManutencao: false,
};

@Injectable()
export class ConfiguracoesService {
  private readonly logger = new Logger(ConfiguracoesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async obter(): Promise<ConfiguracaoSistemaInput> {
    const row = await this.ensureRow();
    return this.toDto(row);
  }

  async atualizar(
    input: ConfiguracaoSistemaInput,
    adminId: string,
  ): Promise<ConfiguracaoSistemaInput> {
    const updated = await this.prisma.configuracaoSistema.update({
      where: { id: CONFIG_ID },
      data: {
        ...input,
        atualizadoPorId: adminId,
      },
    });

    this.logger.log("Configurações globais atualizadas", {
      adminId,
      taxaPadrao: input.taxaPadrao,
      modoManutencao: input.modoManutencao,
    });

    return this.toDto(updated);
  }

  /** Taxa mensal em decimal (ex.: 1.89% → 0.0189) para simulações e crédito. */
  async taxaPadraoDecimal(): Promise<number> {
    const { taxaPadrao } = await this.obter();
    return taxaPadrao / 100;
  }

  private async ensureRow(): Promise<ConfiguracaoSistema> {
    return this.prisma.configuracaoSistema.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, ...CONFIGURACAO_DEFAULTS },
      update: {},
    });
  }

  private toDto(row: ConfiguracaoSistema): ConfiguracaoSistemaInput {
    return {
      taxaMensalMin: row.taxaMensalMin,
      taxaMensalMax: row.taxaMensalMax,
      taxaPadrao: row.taxaPadrao,
      valorMinCredito: row.valorMinCredito,
      valorMaxCredito: row.valorMaxCredito,
      prazoMaxMeses: row.prazoMaxMeses,
      raioValidacaoMetrosPadrao: row.raioValidacaoMetrosPadrao,
      toleranciaPrecisaoGps: row.toleranciaPrecisaoGps,
      diasAprovacao: row.diasAprovacao,
      limiteEvidenciasMB: row.limiteEvidenciasMB,
      modoManutencao: row.modoManutencao,
    };
  }
}
