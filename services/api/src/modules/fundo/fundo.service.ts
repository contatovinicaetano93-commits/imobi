import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FundoService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [creditos, obrasAtivas, liberacoesPendentes, liberacoesFeitas] = await Promise.all([
      this.prisma.credito.findMany({
        select: { creditoId: true, valorAprovado: true, valorLiberado: true, taxaMensal: true, prazoMeses: true, status: true, criadoEm: true },
      }),
      this.prisma.obra.count({ where: { status: "EM_EXECUCAO" } }),
      this.prisma.liberacaoParcela.findMany({
        where: { status: { in: ["PENDENTE", "PROCESSANDO"] } },
        select: { valor: true, status: true },
      }),
      this.prisma.liberacaoParcela.findMany({
        where: { status: "CONCLUIDA" },
        select: { valor: true },
      }),
    ]);

    const ativos    = creditos.filter((c) => c.status === "ATIVO");
    const vencidos  = creditos.filter((c) => c.status === "VENCIDO" || c.status === "SUSPENSO");
    const quitados  = creditos.filter((c) => c.status === "QUITADO");

    const aum        = ativos.reduce((s, c) => s + Number(c.valorAprovado), 0);
    const liberado   = ativos.reduce((s, c) => s + Number(c.valorLiberado), 0);
    const carteiraNpl = vencidos.reduce((s, c) => s + Number(c.valorAprovado), 0);
    const npl        = aum > 0 ? (carteiraNpl / aum) * 100 : 0;

    const taxaMediaMensal = ativos.length > 0
      ? ativos.reduce((s, c) => s + Number(c.taxaMensal), 0) / ativos.length
      : 0;

    const filaValor = liberacoesPendentes.reduce((s, l) => s + Number(l.valor), 0);
    const totalLiberado = liberacoesFeitas.reduce((s, l) => s + Number(l.valor), 0);

    return {
      aum,
      liberado,
      pctLiberado: aum > 0 ? (liberado / aum) * 100 : 0,
      npl,
      taxaMediaMensal,
      tirEstimadaAnual: ((1 + taxaMediaMensal / 100) ** 12 - 1) * 100,
      totalOperacoes: creditos.length,
      operacoesAtivas: ativos.length,
      operacoesQuitadas: quitados.length,
      operacoesInadimplentes: vencidos.length,
      obrasAtivas,
      filaLiberacaoValor: filaValor,
      filaLiberacaoCount: liberacoesPendentes.length,
      totalHistoricoLiberado: totalLiberado,
    };
  }

  async carteira() {
    const creditos = await this.prisma.credito.findMany({
      orderBy: { criadoEm: "desc" },
      take: 50,
      include: {
        usuario: { select: { nome: true } },
        obra: {
          select: {
            obraId: true,
            nome: true,
            status: true,
            etapas: { select: { status: true } },
          },
        },
      },
    });

    return creditos.map((c) => {
      const totalEtapas = c.obra?.etapas.length ?? 0;
      const concluidasEng = c.obra?.etapas.filter((e) =>
        ["APROVADA_ENGENHEIRO", "CONCLUIDA"].includes(e.status)
      ).length ?? 0;
      const progressoFisico = totalEtapas > 0 ? Math.round((concluidasEng / totalEtapas) * 100) : 0;
      const valorAprovado = Number(c.valorAprovado);
      const valorLiberado = Number(c.valorLiberado);

      return {
        creditoId: c.creditoId,
        construtor: c.usuario?.nome ?? "—",
        obraNome: c.obra?.nome ?? "—",
        valorAprovado,
        valorLiberado,
        pctLiberado: valorAprovado > 0 ? Math.round((valorLiberado / valorAprovado) * 100) : 0,
        taxaMensal: Number(c.taxaMensal),
        prazoMeses: c.prazoMeses,
        status: c.status,
        progressoFisico,
        criadoEm: c.criadoEm.toISOString(),
      };
    });
  }

  async fluxoCaixa() {
    const liberacoes = await this.prisma.liberacaoParcela.findMany({
      orderBy: { criadoEm: "desc" },
      take: 60,
      include: {
        credito: {
          select: {
            valorAprovado: true,
            obra: { select: { nome: true } },
          },
        },
      },
    });

    return liberacoes.map((l) => ({
      liberacaoId: l.liberacaoId,
      valor: Number(l.valor),
      status: l.status,
      obraNome: l.credito?.obra?.nome ?? "—",
      criadoEm: l.criadoEm.toISOString(),
    }));
  }
}
