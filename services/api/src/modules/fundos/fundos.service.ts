import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const UFS_BR = new Set([
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
]);

@Injectable()
export class FundosService {
  constructor(private readonly prisma: PrismaService) {}

  async portfolio() {
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

    const [
      creditosAgregados,
      creditosVencidosAgregados,
      obrasAtivas,
      obrasTotal,
      liberacoesRecentes,
      totalCreditosCount,
      creditosVencidosCount,
    ] = await Promise.all([
      this.prisma.credito.aggregate({
        _sum: { valorAprovado: true, valorLiberado: true },
        where: { status: { in: ["ATIVO", "VENCIDO", "SUSPENSO"] } },
      }),
      this.prisma.credito.aggregate({
        _sum: { valorLiberado: true },
        where: { status: "VENCIDO" },
      }),
      this.prisma.obra.count({ where: { status: "EM_EXECUCAO" } }),
      this.prisma.obra.count(),
      this.prisma.liberacaoParcela.findMany({
        where: {
          status: "CONCLUIDA",
          processadoEm: { gte: umAnoAtras },
        },
        select: { valor: true, processadoEm: true },
      }),
      this.prisma.credito.count({ where: { status: { in: ["ATIVO", "VENCIDO", "SUSPENSO"] } } }),
      this.prisma.credito.count({ where: { status: "VENCIDO" } }),
    ]);

    const totalAprovado = Number(creditosAgregados._sum.valorAprovado ?? 0);
    const totalDesembolsado = Number(creditosAgregados._sum.valorLiberado ?? 0);
    const valorEmRisco = Number(creditosVencidosAgregados._sum.valorLiberado ?? 0);
    const inadimplenciaRate =
      totalCreditosCount > 0
        ? Number(((creditosVencidosCount / totalCreditosCount) * 100).toFixed(2))
        : 0;
    const ticketMedioAprovado =
      totalCreditosCount > 0
        ? Number((totalAprovado / totalCreditosCount).toFixed(2))
        : 0;

    const liberacoesPorMes = this.agruparPorMes(liberacoesRecentes);
    const crescimentoMensal = this.calcularCrescimentoMensal(liberacoesPorMes);

    return {
      totalDesembolsado,
      totalAprovado,
      obrasAtivas,
      obrasTotal,
      inadimplenciaRate,
      valorEmRisco,
      ticketMedioAprovado,
      crescimentoMensal,
      liberacoesPorMes,
    };
  }

  async listarObras(
    limit = 20,
    offset = 0,
    filtros: { status?: string; busca?: string } = {},
  ) {
    const where: Record<string, unknown> = {};

    if (filtros.status && filtros.status !== "todas") {
      where.status = filtros.status;
    }
    if (filtros.busca) {
      where.OR = [
        { nome: { contains: filtros.busca, mode: "insensitive" } },
        { endereco: { contains: filtros.busca, mode: "insensitive" } },
        { usuario: { nome: { contains: filtros.busca, mode: "insensitive" } } },
      ];
    }

    const [obras, total] = await Promise.all([
      this.prisma.obra.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { criadoEm: "desc" },
        include: {
          usuario: { select: { nome: true, cpf: true } },
          credito: {
            select: {
              creditoId: true,
              valorAprovado: true,
              valorLiberado: true,
              taxaMensal: true,
              prazoMeses: true,
              status: true,
            },
          },
          etapas: { select: { status: true } },
        },
      }),
      this.prisma.obra.count({ where }),
    ]);

    return {
      obras: obras.map((o) => {
        const etapasConcluidas = o.etapas.filter((e) => e.status === "CONCLUIDA").length;
        const progresso =
          o.etapas.length > 0
            ? Number(((etapasConcluidas / o.etapas.length) * 100).toFixed(1))
            : 0;
        return {
          obraId: o.obraId,
          nome: o.nome,
          endereco: o.endereco,
          geoLatitude: o.geoLatitude,
          geoLongitude: o.geoLongitude,
          status: o.status,
          criadoEm: o.criadoEm,
          tomador: o.usuario,
          credito: o.credito
            ? {
                creditoId: o.credito.creditoId,
                valorAprovado: Number(o.credito.valorAprovado),
                valorLiberado: Number(o.credito.valorLiberado),
                taxaMensal: Number(o.credito.taxaMensal),
                prazoMeses: o.credito.prazoMeses,
                status: o.credito.status,
              }
            : null,
          progresso,
          etapasTotal: o.etapas.length,
          etapasConcluidas,
        };
      }),
      total,
      limit,
      offset,
    };
  }

  async porRegiao() {
    const obras = await this.prisma.obra.findMany({
      orderBy: { criadoEm: "desc" },
      select: {
        endereco: true,
        status: true,
        credito: {
          select: { valorAprovado: true, valorLiberado: true },
        },
      },
    });

    const regioes = new Map<
      string,
      { obrasCount: number; valorAprovado: number; valorDesembolsado: number }
    >();

    for (const obra of obras) {
      const uf = this.extrairUF(obra.endereco);
      const cur = regioes.get(uf) ?? {
        obrasCount: 0,
        valorAprovado: 0,
        valorDesembolsado: 0,
      };
      regioes.set(uf, {
        obrasCount: cur.obrasCount + 1,
        valorAprovado: cur.valorAprovado + Number(obra.credito?.valorAprovado ?? 0),
        valorDesembolsado: cur.valorDesembolsado + Number(obra.credito?.valorLiberado ?? 0),
      });
    }

    return {
      regioes: Array.from(regioes.entries())
        .map(([uf, data]) => ({ uf, ...data }))
        .sort((a, b) => b.valorDesembolsado - a.valorDesembolsado),
    };
  }

  async exposicaoCredito() {
    const creditos = await this.prisma.credito.findMany({
      where: { status: { in: ["ATIVO", "VENCIDO", "SUSPENSO"] } },
      select: {
        valorAprovado: true,
        valorLiberado: true,
        status: true,
        usuario: { select: { usuarioId: true, nome: true, cpf: true } },
        obras: { select: { obraId: true } },
      },
    });

    const totalPortfolio = creditos.reduce(
      (sum, c) => sum + Number(c.valorLiberado),
      0,
    );

    const ltvTotal = creditos.reduce((sum, c) => {
      const aprovado = Number(c.valorAprovado);
      return sum + (aprovado > 0 ? Number(c.valorLiberado) / aprovado : 0);
    }, 0);
    const ltvMedio =
      creditos.length > 0
        ? Number(((ltvTotal / creditos.length) * 100).toFixed(1))
        : 0;

    type TomadorEntry = {
      usuarioId: string;
      nome: string;
      cpf: string;
      creditoTotal: number;
      valorDesembolsado: number;
      obras: number;
      statusCreditos: string[];
    };

    const tomadoresMap = new Map<string, TomadorEntry>();

    for (const c of creditos) {
      const { usuarioId, nome, cpf } = c.usuario;
      const cur = tomadoresMap.get(usuarioId) ?? {
        usuarioId,
        nome,
        cpf,
        creditoTotal: 0,
        valorDesembolsado: 0,
        obras: 0,
        statusCreditos: [],
      };
      tomadoresMap.set(usuarioId, {
        ...cur,
        creditoTotal: cur.creditoTotal + Number(c.valorAprovado),
        valorDesembolsado: cur.valorDesembolsado + Number(c.valorLiberado),
        obras: cur.obras + c.obras.length,
        statusCreditos: [...cur.statusCreditos, c.status],
      });
    }

    const tomadores = Array.from(tomadoresMap.values())
      .map(({ statusCreditos, ...t }) => ({
        ...t,
        utilizacaoPercentual:
          t.creditoTotal > 0
            ? Number(((t.valorDesembolsado / t.creditoTotal) * 100).toFixed(1))
            : 0,
        status: statusCreditos.includes("VENCIDO")
          ? "VENCIDO"
          : statusCreditos.includes("SUSPENSO")
            ? "SUSPENSO"
            : "ATIVO",
      }))
      .sort((a, b) => b.valorDesembolsado - a.valorDesembolsado);

    const top5Valor = tomadores
      .slice(0, 5)
      .reduce((sum, t) => sum + t.valorDesembolsado, 0);
    const concentracaoTop5 =
      totalPortfolio > 0
        ? Number(((top5Valor / totalPortfolio) * 100).toFixed(1))
        : 0;

    return {
      tomadores,
      ltvMedio,
      concentracaoTop5,
      totalPortfolio,
    };
  }

  private agruparPorMes(
    liberacoes: { valor: number | bigint; processadoEm: Date | null }[],
  ): { mes: string; valor: number }[] {
    const meses = new Map<string, number>();

    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      meses.set(key, 0);
    }

    for (const lib of liberacoes) {
      if (!lib.processadoEm) continue;
      const d = lib.processadoEm;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (meses.has(key)) {
        meses.set(key, (meses.get(key) ?? 0) + Number(lib.valor));
      }
    }

    return Array.from(meses.entries()).map(([mes, valor]) => ({ mes, valor }));
  }

  private calcularCrescimentoMensal(meses: { mes: string; valor: number }[]): number {
    if (meses.length < 2) return 0;
    const ultimo = meses[meses.length - 1].valor;
    const penultimo = meses[meses.length - 2].valor;
    if (penultimo === 0) return 0;
    return Number((((ultimo - penultimo) / penultimo) * 100).toFixed(2));
  }

  private extrairUF(endereco: string): string {
    const tokens = endereco.match(/\b([A-Z]{2})\b/g);
    if (tokens) {
      const found = tokens.find((t) => UFS_BR.has(t));
      if (found) return found;
    }
    const dashMatch = endereco.match(/[-,]\s*([A-Za-z]{2})\s*(?:[,\s]|$)/);
    if (dashMatch) {
      const candidate = dashMatch[1].toUpperCase();
      if (UFS_BR.has(candidate)) return candidate;
    }
    return "Outros";
  }
}
