import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
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
      include: { liberacoes: { orderBy: { criadoEm: "desc" } } },
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

  async liberacoes(creditoId: string, usuarioId: string) {
    const credito = await this.prisma.credito.findUnique({ where: { creditoId }, select: { usuarioId: true } });
    if (!credito) throw new NotFoundException("Crédito não encontrado.");
    if (credito.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado.");

    const data = await this.prisma.liberacaoParcela.findMany({
      where: { creditoId },
      orderBy: { criadoEm: "desc" },
    });
    return {
      data: data.map((l) => ({
        id: l.liberacaoId,
        valor: Number(l.valor),
        status: l.status,
        processadoEm: l.processadoEm?.toISOString() ?? null,
        motivo: l.motivo ?? null,
        criadoEm: l.criadoEm.toISOString(),
      })),
      total: data.length,
    };
  }

  async cancelar(creditoId: string, motivo?: string) {
    const credito = await this.prisma.credito.findUnique({ where: { creditoId } });
    if (!credito) throw new NotFoundException("Crédito não encontrado.");
    if (credito.status === "CANCELADO") throw new BadRequestException("Crédito já está cancelado.");
    if (credito.status === "QUITADO") throw new BadRequestException("Não é possível cancelar um crédito quitado.");

    await this.prisma.credito.update({
      where: { creditoId },
      data: { status: "CANCELADO" },
    });
    return { ok: true, creditoId, motivo: motivo ?? null };
  }
}
