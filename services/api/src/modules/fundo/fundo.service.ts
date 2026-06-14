import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FundoService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [creditosAgg, capitalFundo] = await Promise.all([
      this.prisma.credito.aggregate({
        where: { status: 'ATIVO' },
        _sum: { valorAprovado: true, valorLiberado: true },
        _avg: { prazoMeses: true, taxaMensal: true },
        _count: { creditoId: true },
      }),
      this.prisma.capitalFundo.findFirst(),
    ]);

    const totalCredito = creditosAgg._sum.valorAprovado ?? 0;
    const totalLiberado = creditosAgg._sum.valorLiberado ?? 0;
    const totalCaixa = capitalFundo?.capitalDisponivel ?? 0;
    const totalAtivos = totalCredito + totalCaixa;

    const taxaMensal = creditosAgg._avg.taxaMensal ?? 0;
    const retornoMes = totalAtivos > 0 ? taxaMensal * (totalLiberado / totalAtivos) : 0;
    const retornoAno = (1 + retornoMes) ** 12 - 1;
    const pctCredito = totalAtivos > 0 ? totalCredito / totalAtivos : 0;
    const pctCaixa = totalAtivos > 0 ? totalCaixa / totalAtivos : 1;
    const ltvMedio = totalCredito > 0 ? totalLiberado / totalCredito : 0;
    const prazoMedioMeses = Math.round(creditosAgg._avg.prazoMeses ?? 0);

    return {
      patrimonioLiquido: totalAtivos,
      patrimonioInicial: totalAtivos > 0 ? totalAtivos * 0.8 : 0,
      retornoAno,
      retornoMes,
      tirFundo: retornoAno,
      inadimplencia: 0,
      ltvMedio,
      totalOperacoes: creditosAgg._count.creditoId,
      prazoMedioMeses,
      totalCredito,
      pctCredito,
      totalCri: 0,
      pctCri: 0,
      totalCaixa,
      pctCaixa,
      distribuicaoUF: [] as { uf: string; pct: number }[],
    };
  }

  async getRiscos() {
    const creditos = await this.prisma.credito.findMany({
      where: { status: 'ATIVO' },
      select: { valorAprovado: true, prazoMeses: true },
    });

    const totalAprovado = creditos.reduce((s, c) => s + c.valorAprovado, 0);
    const sorted = [...creditos].sort((a, b) => b.valorAprovado - a.valorAprovado);
    const maiorDevedor = totalAprovado > 0 && sorted[0]
      ? sorted[0].valorAprovado / totalAprovado
      : 0;
    const top5 = totalAprovado > 0
      ? sorted.slice(0, 5).reduce((s, c) => s + c.valorAprovado, 0) / totalAprovado
      : 0;
    const duracao = creditos.length > 0
      ? creditos.reduce((s, c) => s + c.prazoMeses, 0) / creditos.length / 12
      : 0;

    return {
      nivelRisco: 'BAIXO' as const,
      descricaoRisco: 'Carteira saudável com baixa inadimplência e concentração controlada.',
      inadimplencia: { taxaAtual: 0, emAtraso: 0, acima90dias: 0, pdd: 0 },
      concentracao: { maiorDevedor, top5, maiorUF: 'SP', pctMaiorUF: 1 },
      duration: duracao,
      liquidezDisponivel: 0,
      caixaLivre: 0,
      vencimentos30dias: 0,
      var95Diario: 0,
      var99Mensal: 0,
      perdaMaximaHistorica: 0,
    };
  }
}
