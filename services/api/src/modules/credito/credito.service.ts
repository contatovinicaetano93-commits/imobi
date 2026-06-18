import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { simularCredito, TAXA_MENSAL_SIMULACAO_CREDITO } from "@imbobi/core";
import type { SolicitacaoCreditoInput, SimulacaoCreditoInput } from "@imbobi/schemas";

@Injectable()
export class CreditoService {
  constructor(private readonly prisma: PrismaService) {}

  simular(input: SimulacaoCreditoInput) {
    return {
      valorSolicitado: input.valorSolicitado,
      prazoMeses: input.prazoMeses,
      ...simularCredito(input.valorSolicitado, TAXA_MENSAL_SIMULACAO_CREDITO, input.prazoMeses),
    };
  }

  async solicitar(usuarioId: string, input: SolicitacaoCreditoInput) {
    return this.prisma.credito.create({
      data: {
        usuarioId,
        valorAprovado: input.valorSolicitado,
        valorLiberado: 0,
        taxaMensal: TAXA_MENSAL_SIMULACAO_CREDITO,
        prazoMeses: input.prazoMeses,
      },
    });
  }

  async buscarPorUsuario(usuarioId: string) {
    const creditos = await this.prisma.credito.findMany({
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

    return creditos.map((c) => ({
      id: c.creditoId,
      valorAprovado: Number(c.valorAprovado),
      valorLiberado: Number(c.valorLiberado),
      taxaMensal: Number(c.taxaMensal),
      prazoMeses: c.prazoMeses,
      status: c.status,
      dataAprovacao: c.criadoEm?.toISOString(),
      obras: c.obras.map((o) => ({ id: o.obraId, nome: o.nome, status: o.status })),
      liberacoes: c.liberacoes.map((l) => ({
        id: l.liberacaoId,
        valor: Number(l.valor),
        status: l.status,
        processadoEm: l.processadoEm?.toISOString(),
      })),
    }));
  }

  async extrato(creditoId: string, usuarioId: string) {
    const credito = await this.prisma.credito.findUnique({
      where: { creditoId },
      include: {
        liberacoes: {
          orderBy: { criadoEm: "desc" },
        },
      },
    });
    if (!credito) throw new NotFoundException("Crédito não encontrado.");
    if (credito.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado.");
    return {
      creditoId: credito.creditoId,
      valorAprovado: credito.valorAprovado,
      valorLiberado: credito.valorLiberado,
      taxaMensal: credito.taxaMensal,
      prazoMeses: credito.prazoMeses,
      status: credito.status,
      liberacoes: credito.liberacoes.map((lib) => ({
        liberacaoId: lib.liberacaoId,
        valor: lib.valor,
        status: lib.status === "FALHA" ? "FALHOU" : lib.status,
        criadoEm: lib.criadoEm.toISOString(),
        motivo: lib.motivo ?? undefined,
      })),
    };
  }
}
