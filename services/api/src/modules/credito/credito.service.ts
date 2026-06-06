import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { CreditAnalysisService } from "./credit-analysis.service";
import { simularCredito } from "@imbobi/core";
import type { SolicitacaoCreditoInput, SimulacaoCreditoInput } from "@imbobi/schemas";

@Injectable()
export class CreditoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analise: CreditAnalysisService,
    private readonly notificacoes: NotificacoesService
  ) {}

  simular(input: SimulacaoCreditoInput) {
    const TAXA_MENSAL = 0.0099;
    return simularCredito(input.valorSolicitado, TAXA_MENSAL, input.prazoMeses);
  }

  async solicitar(usuarioId: string, input: SolicitacaoCreditoInput) {
    const decisao = await this.analise.analisar(usuarioId, input);

    if (!decisao.aprovado) {
      return {
        aprovado: false,
        score: decisao.score,
        motivo: decisao.motivo,
      };
    }

    const credito = await this.prisma.credito.create({
      data: {
        usuarioId,
        valorAprovado: decisao.valorAprovado,
        valorLiberado: 0,
        taxaMensal: decisao.taxaMensal,
        prazoMeses: decisao.prazoMeses,
      },
    });

    // Notifica o tomador sobre a aprovação (fire-and-forget)
    this.notificacoes
      .criar(
        usuarioId,
        "CREDITO_APROVADO" as never,
        "Crédito aprovado!",
        `Seu crédito de R$ ${decisao.valorAprovado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} foi aprovado com taxa de ${(decisao.taxaMensal * 100).toFixed(2)}% a.m.`,
        "/dashboard/credito"
      )
      .catch(() => {});

    return {
      aprovado: true,
      creditoId: credito.creditoId,
      valorAprovado: decisao.valorAprovado,
      taxaMensal: decisao.taxaMensal,
      prazoMeses: decisao.prazoMeses,
      score: decisao.score,
      motivo: decisao.motivo,
    };
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
