import { Injectable, NotFoundException, ForbiddenException, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { PrismaService } from "../prisma/prisma.service";
import { JornadaService } from "../jornada/jornada.service";
import { invalidateJornadaCache } from "../jornada/jornada-cache";
import { gerarCronogramaPagamento, resumirCronograma, simularCredito } from "@imbobi/core";
import type { SolicitacaoCreditoInput, SimulacaoCreditoInput } from "@imbobi/schemas";

@Injectable()
export class CreditoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jornada: JornadaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  simular(input: SimulacaoCreditoInput) {
    const TAXA_MENSAL = 0.0099;
    return simularCredito(input.valorSolicitado, TAXA_MENSAL, input.prazoMeses);
  }

  async solicitar(usuarioId: string, input: SolicitacaoCreditoInput) {
    await this.jornada.assertPodeSolicitarCredito(usuarioId);
    const credito = await this.prisma.credito.create({
      data: {
        usuarioId,
        valorAprovado: input.valorSolicitado,
        valorLiberado: 0,
        taxaMensal: 0.0099,
        prazoMeses: input.prazoMeses,
      },
    });
    await invalidateJornadaCache(this.cache, usuarioId);
    return credito;
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

    const valorAprovado = Number(credito.valorAprovado);
    const valorLiberado = Number(credito.valorLiberado);
    const taxaMensal = Number(credito.taxaMensal);
    const valorPrincipal = valorLiberado > 0 ? valorLiberado : valorAprovado;

    const parcelasPagas: Record<number, string> = {};
    credito.liberacoes
      .filter((lib) => lib.status === "CONCLUIDA" && lib.processadoEm)
      .forEach((lib, index) => {
        parcelasPagas[index + 1] = lib.processadoEm!.toISOString().slice(0, 10);
      });

    const cronograma = gerarCronogramaPagamento({
      valorPrincipal,
      taxaMensalDecimal: taxaMensal,
      prazoMeses: credito.prazoMeses,
      dataInicio: credito.criadoEm ?? undefined,
      parcelasPagas: Object.keys(parcelasPagas).length > 0 ? parcelasPagas : undefined,
    });

    const resumo = resumirCronograma(cronograma);

    return {
      creditoId: credito.creditoId,
      valorSolicitado: valorAprovado,
      valorAprovado,
      valorLiberado,
      taxaMensal,
      prazoMeses: credito.prazoMeses,
      status: credito.status,
      criadoEm: credito.criadoEm.toISOString(),
      cronograma,
      resumo,
      liberacoes: credito.liberacoes.map((lib) => ({
        liberacaoId: lib.liberacaoId,
        valor: Number(lib.valor),
        status: lib.status === "FALHA" ? "FALHOU" : lib.status,
        criadoEm: lib.criadoEm.toISOString(),
        processadoEm: lib.processadoEm?.toISOString(),
        motivo: lib.motivo ?? undefined,
      })),
    };
  }
}
