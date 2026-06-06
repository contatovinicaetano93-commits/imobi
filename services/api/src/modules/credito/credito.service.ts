import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { simularCredito } from "@imbobi/core";
import type { SolicitacaoCreditoInput, SimulacaoCreditoInput } from "@imbobi/schemas";

@Injectable()
export class CreditoService {
  constructor(private readonly prisma: PrismaService) {}

  simular(input: SimulacaoCreditoInput) {
    const TAXA_MENSAL = 0.0099;
    return simularCredito(input.valorSolicitado, TAXA_MENSAL, input.prazoMeses);
  }

  async solicitar(usuarioId: string, input: SolicitacaoCreditoInput) {
    return this.prisma.credito.create({
      data: {
        usuarioId,
        valorAprovado: input.valorSolicitado,
        valorLiberado: 0,
        taxaMensal: 0.0099,
        prazoMeses: input.prazoMeses,
      },
    });
  }

  async buscarPorUsuario(usuarioId: string) {
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
  }

  async extrato(creditoId: string, usuarioId: string) {
    const credito = await this.prisma.credito.findUnique({
      where: { creditoId },
      include: { liberacoes: { orderBy: { criadoEm: "desc" } } },
    });
    if (!credito) throw new NotFoundException("Crédito não encontrado.");
    if (credito.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado.");
    return credito;
  }
}
