import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  simularCredito,
  calcularTaxaPorScoreEPrazo,
} from "@imbobi/core";
import type { SolicitacaoCreditoInput, SimulacaoCreditoInput } from "@imbobi/schemas";

const TAXA_PADRAO = 0.0185; // 1,85% — máxima, usada quando score não informado
const FEE_ESTRUTURACAO = 0.03;

@Injectable()
export class CreditoService {
  constructor(private readonly prisma: PrismaService) {}

  async simular(input: SimulacaoCreditoInput, usuarioId?: string) {
    let taxa = TAXA_PADRAO;

    // Se o usuário está logado, usa o score real para determinar a taxa
    if (usuarioId && !input.scoreConstrutibilidade) {
      const ultimoScore = await this.prisma.scoreHistorico.findFirst({
        where: { usuarioId },
        orderBy: { criadoEm: "desc" },
        select: { score: true },
      });
      if (ultimoScore) {
        const taxaCalculada = calcularTaxaPorScoreEPrazo(
          ultimoScore.score,
          input.prazoMeses,
        );
        if (taxaCalculada !== null) taxa = taxaCalculada;
      }
    } else if (input.scoreConstrutibilidade !== undefined) {
      const taxaCalculada = calcularTaxaPorScoreEPrazo(
        input.scoreConstrutibilidade,
        input.prazoMeses,
      );
      if (taxaCalculada !== null) taxa = taxaCalculada;
    }

    return simularCredito(input.valorSolicitado, taxa, input.prazoMeses);
  }

  async solicitar(usuarioId: string, input: SolicitacaoCreditoInput) {
    const ultimoScore = await this.prisma.scoreHistorico.findFirst({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
      select: { score: true },
    });

    const score = ultimoScore?.score ?? 0;
    const taxa =
      calcularTaxaPorScoreEPrazo(score, input.prazoMeses) ?? TAXA_PADRAO;
    const feeEstruturacao = input.valorSolicitado * FEE_ESTRUTURACAO;

    return this.prisma.credito.create({
      data: {
        usuarioId,
        valorAprovado: input.valorSolicitado,
        valorLiberado: 0,
        taxaMensal: taxa,
        prazoMeses: input.prazoMeses,
        tipoGarantia: input.tipoGarantia,
        creditoPonte: input.creditoPonte ?? false,
        feeEstruturacao,
      },
    });
  }

  async buscarPorUsuario(usuarioId: string) {
    const creditos = await this.prisma.credito.findMany({
      where: { usuarioId },
      include: {
        obras: { select: { obraId: true, nome: true, status: true } },
        liberacoes: {
          select: {
            liberacaoId: true,
            valor: true,
            feeTranche: true,
            valorLiquido: true,
            status: true,
            processadoEm: true,
          },
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
      taxaMensalPercent: Number(c.taxaMensal) * 100,
      prazoMeses: c.prazoMeses,
      tipoGarantia: c.tipoGarantia,
      creditoPonte: c.creditoPonte,
      feeEstruturacao: c.feeEstruturacao ? Number(c.feeEstruturacao) : null,
      status: c.status,
      dataAprovacao: c.criadoEm?.toISOString(),
      obras: c.obras.map((o) => ({ id: o.obraId, nome: o.nome, status: o.status })),
      liberacoes: c.liberacoes.map((l) => ({
        id: l.liberacaoId,
        valorBruto: Number(l.valor),
        feeTranche: l.feeTranche ? Number(l.feeTranche) : null,
        valorLiquido: l.valorLiquido ? Number(l.valorLiquido) : null,
        status: l.status,
        processadoEm: l.processadoEm?.toISOString(),
      })),
    }));
  }

  async extrato(creditoId: string, usuarioId: string) {
    const credito = await this.prisma.credito.findUnique({
      where: { creditoId },
      include: {
        liberacoes: { orderBy: { criadoEm: "desc" } },
      },
    });
    if (!credito) throw new NotFoundException("Crédito não encontrado.");
    if (credito.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado.");

    return {
      creditoId: credito.creditoId,
      valorAprovado: credito.valorAprovado,
      valorLiberado: credito.valorLiberado,
      taxaMensal: credito.taxaMensal,
      taxaMensalPercent: Number(credito.taxaMensal) * 100,
      feeEstruturacao: credito.feeEstruturacao,
      tipoGarantia: credito.tipoGarantia,
      creditoPonte: credito.creditoPonte,
      prazoMeses: credito.prazoMeses,
      status: credito.status,
      liberacoes: credito.liberacoes.map((lib) => ({
        liberacaoId: lib.liberacaoId,
        valorBruto: lib.valor,
        feeTranche: lib.feeTranche,
        valorLiquido: lib.valorLiquido,
        status: lib.status === "FALHA" ? "FALHOU" : lib.status,
        criadoEm: lib.criadoEm.toISOString(),
        motivo: lib.motivo ?? undefined,
      })),
    };
  }
}
