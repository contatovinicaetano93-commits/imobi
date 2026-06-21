import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { simularCredito } from "@imbobi/core";
import type { SolicitacaoCreditoInput, SimulacaoCreditoInput } from "@imbobi/schemas";

@Injectable()
export class CreditoService {
  constructor(private readonly prisma: PrismaService) {}

  private get taxaMensalDefault(): number {
    return Number(process.env.TAXA_MENSAL_DEFAULT ?? "0.0099");
  }

  simular(input: SimulacaoCreditoInput) {
    return simularCredito(input.valorSolicitado, this.taxaMensalDefault, input.prazoMeses);
  }

  async solicitar(usuarioId: string, input: SolicitacaoCreditoInput) {
    return this.prisma.credito.create({
      data: {
        usuarioId,
        valorAprovado: input.valorSolicitado,
        valorLiberado: 0,
        taxaMensal: this.taxaMensalDefault,
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
          take: 50,
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

  async estornar(
    creditoId: string,
    liberacaoId: string,
    solicitanteId: string,
    motivo: string,
  ) {
    if (!motivo?.trim()) throw new BadRequestException("Motivo é obrigatório para estorno.");
    if (motivo.length > 1000) throw new BadRequestException("Motivo não pode exceder 1000 caracteres.");

    return this.prisma.$transaction(async (tx) => {
      // Advisory lock: same key as liberacao worker to prevent race with in-flight liberação
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`liberacao:${creditoId}`}))`;

      const lancamento = await tx.lancamentoFinanceiro.findFirst({
        where: { liberacaoId, tipo: 'CREDITO' },
      });
      if (!lancamento) throw new NotFoundException('Lançamento de liberação não encontrado.');

      // Prevent double reversal
      const jaEstornado = await tx.lancamentoFinanceiro.findFirst({
        where: { idempotencyKey: `estorno:${liberacaoId}` },
      });
      if (jaEstornado) throw new ConflictException('Esta liberação já foi estornada.');

      const valor = Number(lancamento.valor);

      const estorno = await tx.lancamentoFinanceiro.create({
        data: {
          tipo: 'DEBITO',
          categoria: 'ESTORNO_LIBERACAO',
          valor,
          creditoId,
          usuarioId: solicitanteId,
          descricao: `Estorno de liberação: ${motivo}`,
          metadata: { estornoDeId: lancamento.lancamentoId, motivo } as any,
          idempotencyKey: `estorno:${liberacaoId}`,
        },
      });

      await tx.credito.update({
        where: { creditoId },
        data: { valorLiberado: { decrement: valor } },
      });

      await (tx as any).auditLog.create({
        data: {
          acao: 'ESTORNO_LIBERACAO',
          entidade: 'LancamentoFinanceiro',
          entidadeId: lancamento.lancamentoId,
          usuarioId: solicitanteId,
          metadata: { creditoId, liberacaoId, valor, motivo },
        },
      });

      return { estornoId: estorno.lancamentoId, valor, motivo };
    });
  }
}
