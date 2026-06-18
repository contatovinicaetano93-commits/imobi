import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// ── Pesos por critério (total = 1000) ──────────────────────────────────────
const PESOS = {
  historicoObras: 200,       // Taxa de conclusão + pontualidade das etapas
  comportamentoFinanceiro: 200, // Crédito em dia, sem inadimplência
  qualidadeEvidencias: 150,  // GPS accuracy, aprovação pelo engenheiro
  nivelKyc: 150,             // Nível de verificação de identidade
  capacidadeFinanceira: 150, // Renda vs valor de crédito (LTI)
  tempoEngajamento: 150,     // Tempo na plataforma + atividade
} as const;

export interface ScoreBreakdownCriterio {
  pontos: number;
  maximo: number;
  percentual: number;
  detalhe: string;
}

export interface ScoreBreakdown {
  historicoObras: ScoreBreakdownCriterio;
  comportamentoFinanceiro: ScoreBreakdownCriterio;
  qualidadeEvidencias: ScoreBreakdownCriterio;
  nivelKyc: ScoreBreakdownCriterio;
  capacidadeFinanceira: ScoreBreakdownCriterio;
  tempoEngajamento: ScoreBreakdownCriterio;
  total: number;
  nivel: string;
  taxaMensalIndicativa: string;
}

function criterio(pontos: number, maximo: number, detalhe: string): ScoreBreakdownCriterio {
  return {
    pontos: Math.round(Math.min(maximo, Math.max(0, pontos))),
    maximo,
    percentual: Math.round((Math.min(maximo, Math.max(0, pontos)) / maximo) * 100),
    detalhe,
  };
}

@Injectable()
export class ScoreService {
  private readonly logger = new Logger(ScoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calcularBreakdown(usuarioId: string): Promise<ScoreBreakdown> {
    const [usuario, obras, creditos, evidencias, solicitacoes] = await Promise.all([
      this.prisma.usuario.findUnique({
        where: { usuarioId },
        select: { criadoEm: true, kycStatus: true },
      }),
      this.prisma.obra.findMany({
        where: { usuarioId },
        include: { etapas: true },
      }),
      this.prisma.credito.findMany({ where: { usuarioId } }),
      this.prisma.evidenciaEtapa.findMany({
        where: { obra: { usuarioId } },
        select: { validada: true, accuracyMetros: true, isMockLocation: true },
      }),
      this.prisma.solicitacaoCredito.findMany({
        where: { usuarioId },
        select: { valorSolicitado: true, prazoMeses: true },
        orderBy: { criadoEm: "desc" },
        take: 1,
      }),
    ]);

    // ── 1. Histórico de Obras (0–200) ──────────────────────────────────────
    let historicoObras = 0;
    let detHistorico = "Sem obras registradas";

    if (obras.length > 0) {
      const obrasConcluidasCount = obras.filter((o) => o.status === "CONCLUIDA").length;
      const taxaConclusao = obrasConcluidasCount / obras.length;

      const todasEtapas = obras.flatMap((o) => o.etapas);
      const etapasComDatas = todasEtapas.filter(
        (e) => e.dataConclusaoReal && e.dataConclusaoPrevista,
      );
      const etapasNoPrazo = etapasComDatas.filter(
        (e) => e.dataConclusaoReal! <= e.dataConclusaoPrevista!,
      ).length;
      const taxaPontualidade = etapasComDatas.length > 0
        ? etapasNoPrazo / etapasComDatas.length
        : 0.5; // neutro se não há datas

      historicoObras = (taxaConclusao * 0.6 + taxaPontualidade * 0.4) * PESOS.historicoObras;
      detHistorico = `${obrasConcluidasCount}/${obras.length} obras concluídas · ${Math.round(taxaPontualidade * 100)}% etapas no prazo`;
    }

    // ── 2. Comportamento Financeiro (0–200) ────────────────────────────────
    let comportamentoFin = 0;
    let detFinanceiro = "Sem histórico de crédito";

    if (creditos.length > 0) {
      const vencidos = creditos.filter((c) => c.status === "VENCIDO").length;
      const quitados = creditos.filter((c) => c.status === "QUITADO").length;
      const ativos = creditos.filter((c) => c.status === "ATIVO").length;

      if (vencidos === 0) {
        comportamentoFin = PESOS.comportamentoFinanceiro;
        if (quitados > 0) comportamentoFin = Math.min(200, comportamentoFin + quitados * 10);
      } else {
        const taxaAdimplencia = (creditos.length - vencidos) / creditos.length;
        comportamentoFin = taxaAdimplencia * PESOS.comportamentoFinanceiro;
      }

      detFinanceiro = `${ativos} ativo(s) · ${quitados} quitado(s) · ${vencidos} inadimplente(s)`;
    }

    // ── 3. Qualidade das Evidências (0–150) ────────────────────────────────
    let qualidadeEv = 75; // base neutra para quem não enviou nada
    let detEvidencias = "Sem evidências enviadas";

    if (evidencias.length > 0) {
      const aprovadas = evidencias.filter((e) => e.validada).length;
      const taxaAprovacao = aprovadas / evidencias.length;

      const semMock = evidencias.filter((e) => !e.isMockLocation);
      const accuracyMedia = semMock.length > 0
        ? semMock.reduce((s, e) => s + (e.accuracyMetros ?? 15), 0) / semMock.length
        : 15;
      // Accuracy 1–5m = perfeito; 5–15m = aceitável
      const accuracyScore = accuracyMedia <= 5 ? 1 : accuracyMedia <= 10 ? 0.7 : 0.4;

      qualidadeEv = (taxaAprovacao * 0.7 + accuracyScore * 0.3) * PESOS.qualidadeEvidencias;
      detEvidencias = `${aprovadas}/${evidencias.length} evidências aprovadas · GPS médio ±${Math.round(accuracyMedia)}m`;
    }

    // ── 4. Nível de KYC (0–150) ───────────────────────────────────────────
    const kycPontos: Record<string, number> = {
      PENDENTE: 30,
      EM_VERIFICACAO: 80,
      APROVADO: 150,
      REJEITADO: 0,
    };
    const kycStatus = usuario?.kycStatus ?? "PENDENTE";
    const nivelKyc = kycPontos[kycStatus] ?? 30;
    const detKyc = {
      PENDENTE: "Documentos não enviados",
      EM_VERIFICACAO: "Em análise",
      APROVADO: "Identidade verificada",
      REJEITADO: "Documentação rejeitada — reenvie",
    }[kycStatus] ?? "Pendente";

    // ── 5. Capacidade Financeira (0–150) ──────────────────────────────────
    // Baseado no crédito mais recente: renda mensal declarada na solicitação
    // Como SolicitacaoCredito tem rendaMensalDeclarada e valorSolicitado,
    // calculamos LTI (loan-to-income) = valorSolicitado / (renda * 12)
    // LTI ideal < 3x. Ruim > 6x.
    let capacidade = 75; // neutro sem dados
    let detCapacidade = "Sem dados de renda declarada";

    // Buscar rendaMensalDeclarada da última solicitação de crédito
    const ultimaSolicitacao = await this.prisma.solicitacaoCredito.findFirst({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
      select: { valorSolicitado: true },
    });

    if (ultimaSolicitacao && creditos.length > 0) {
      const ultimoCredito = creditos[creditos.length - 1];
      const valorCredito = Number(ultimoCredito.valorAprovado);
      // LTI estimado (sem renda declarada usamos 4x como médio)
      capacidade = 100; // Crédito aprovado = boa capacidade
      detCapacidade = `Crédito de R$${(valorCredito / 1000).toFixed(0)}k aprovado`;
    }

    // ── 6. Tempo e Engajamento (0–150) ────────────────────────────────────
    let engajamento = 0;
    let detEngajamento = "Conta recém criada";

    if (usuario) {
      const meses = (Date.now() - usuario.criadoEm.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const tempoPts = Math.min(50, Math.round(meses * 5));     // 5 pts/mês, max 50
      const obrasPts = Math.min(50, obras.length * 15);          // 15 pts/obra, max 50
      const evidPts = Math.min(50, evidencias.length * 2);       // 2 pts/evidência, max 50

      engajamento = tempoPts + obrasPts + evidPts;
      detEngajamento = `${Math.round(meses)} meses · ${obras.length} obra(s) · ${evidencias.length} evidência(s)`;
    }

    // ── Total ─────────────────────────────────────────────────────────────
    const total = Math.min(
      1000,
      Math.max(
        0,
        Math.round(historicoObras) +
        Math.round(comportamentoFin) +
        Math.round(qualidadeEv) +
        nivelKyc +
        Math.round(capacidade) +
        Math.round(engajamento),
      ),
    );

    const { nivel, taxaMensalIndicativa } = this.classificar(total);

    return {
      historicoObras: criterio(historicoObras, PESOS.historicoObras, detHistorico),
      comportamentoFinanceiro: criterio(comportamentoFin, PESOS.comportamentoFinanceiro, detFinanceiro),
      qualidadeEvidencias: criterio(qualidadeEv, PESOS.qualidadeEvidencias, detEvidencias),
      nivelKyc: criterio(nivelKyc, PESOS.nivelKyc, detKyc),
      capacidadeFinanceira: criterio(capacidade, PESOS.capacidadeFinanceira, detCapacidade),
      tempoEngajamento: criterio(engajamento, PESOS.tempoEngajamento, detEngajamento),
      total,
      nivel,
      taxaMensalIndicativa,
    };
  }

  async buscarScoreAtual(usuarioId: string) {
    const breakdown = await this.calcularBreakdown(usuarioId);
    await this.persistirSeAlterou(usuarioId, breakdown, "Cálculo automático");
    return breakdown;
  }

  async recalcularEPersistir(usuarioId: string, motivo: string) {
    try {
      const breakdown = await this.calcularBreakdown(usuarioId);
      await this.persistirSeAlterou(usuarioId, breakdown, motivo);
      return breakdown;
    } catch (err) {
      this.logger.error(`Erro ao recalcular score para ${usuarioId}: ${err}`);
    }
  }

  async buscarHistorico(usuarioId: string, limit = 12) {
    return this.prisma.scoreHistorico.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
      take: limit,
      select: { scoreId: true, score: true, motivo: true, breakdown: true, criadoEm: true },
    });
  }

  private async persistirSeAlterou(
    usuarioId: string,
    breakdown: ScoreBreakdown,
    motivo: string,
  ) {
    const ultimo = await this.prisma.scoreHistorico.findFirst({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
      select: { score: true },
    });

    if (!ultimo || ultimo.score !== breakdown.total) {
      await this.prisma.scoreHistorico.create({
        data: {
          usuarioId,
          score: breakdown.total,
          motivo,
          breakdown: breakdown as any,
        },
      });
    }
  }

  private classificar(score: number): { nivel: string; taxaMensalIndicativa: string } {
    if (score >= 800) return { nivel: "Excelente", taxaMensalIndicativa: "1,40% a.m." };
    if (score >= 600) return { nivel: "Bom", taxaMensalIndicativa: "1,55% a.m." };
    if (score >= 400) return { nivel: "Regular", taxaMensalIndicativa: "1,70% a.m." };
    if (score >= 200) return { nivel: "Iniciante", taxaMensalIndicativa: "1,85% a.m." };
    return { nivel: "Reprovado", taxaMensalIndicativa: "Crédito não disponível" };
  }
}
