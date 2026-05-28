import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { simularCredito } from "@imbobi/core";
import type { SolicitacaoCreditoInput, SimulacaoCreditoInput } from "@imbobi/schemas";

@Injectable()
export class CreditoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) {}

  simular(input: SimulacaoCreditoInput) {
    const TAXA_MENSAL = 0.0099;
    return simularCredito(input.valorSolicitado, TAXA_MENSAL, input.prazoMeses);
  }

  async solicitar(usuarioId: string, input: SolicitacaoCreditoInput) {
    const credito = await this.prisma.credito.create({
      data: {
        usuarioId,
        valorAprovado: input.valorSolicitado,
        valorLiberado: 0,
        taxaMensal: 0.0099,
        prazoMeses: input.prazoMeses,
      },
    });
    // Invalidate user's credits cache
    await this.cache.invalidarTudo(usuarioId);
    return credito;
  }

  async buscarPorUsuario(usuarioId: string) {
    return this.cache.obterExtratoComCache(`creditos:${usuarioId}`, async () => {
      return this.prisma.credito.findMany({
        where: { usuarioId },
        include: {
          obras: { select: { obraId: true, nome: true, status: true } },
          liberacoes: {
            select: { liberacaoId: true, valor: true, status: true, processadoEm: true },
            orderBy: { criadoEm: "desc" },
            take: 10,
          },
        },
        orderBy: { criadoEm: "desc" },
      });
    });
  }

  async extrato(creditoId: string) {
    return this.cache.obterExtratoComCache(creditoId, async () => {
      const credito = await this.prisma.credito.findUnique({
        where: { creditoId },
        include: { liberacoes: { orderBy: { criadoEm: "desc" } } },
      });
      if (!credito) throw new NotFoundException("Crédito não encontrado.");
      return credito;
    });
  }
}
