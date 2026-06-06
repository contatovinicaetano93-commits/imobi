import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";

// Mudança mínima de pontos para disparar notificação ao usuário
const DELTA_NOTIFICACAO = 30;

@Injectable()
export class ScoreService {
  private readonly logger = new Logger(ScoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService
  ) {}

  /**
   * Calcula score de construtibilidade (0–1000).
   *
   * Fatores positivos:
   *   - Obras concluídas               até +200
   *   - Taxa de conclusão              até +300
   *   - Créditos em dia                até +200
   *   - Tempo como cliente             até +100
   *   - KYC aprovado                       +200
   *
   * Fatores negativos:
   *   - Penalidades de fraude registradas em ScoreHistorico (motivo FRAUDE_*)
   */
  async calcularScore(usuarioId: string): Promise<number> {
    const [obras, creditos, scoreHistorico] = await Promise.all([
      this.prisma.obra.findMany({ where: { usuarioId } }),
      this.prisma.credito.findMany({ where: { usuarioId } }),
      this.prisma.scoreHistorico.findMany({
        where: { usuarioId, motivo: { startsWith: "FRAUDE" } },
        select: { score: true },
      }),
    ]);

    let score = 600;

    // 1. Obras concluídas (+200)
    const obrasConcluidasNoPrazo = obras.filter((o) => o.status === "CONCLUIDA").length;
    score += Math.min(200, obrasConcluidasNoPrazo * 50);

    // 2. Taxa média de conclusão (+300)
    const taxaConclusao =
      obras.length > 0 ? obras.filter((o) => o.status === "CONCLUIDA").length / obras.length : 0;
    score += Math.round(taxaConclusao * 300);

    // 3. Créditos sem atrasos (+200)
    const creditosSemAtraso = creditos.filter(
      (c) => c.status === "ATIVO" || c.status === "QUITADO"
    ).length;
    score += Math.min(200, creditosSemAtraso * 100);

    // 4. Tempo como cliente (+100)
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { criadoEm: true, kycStatus: true },
    });
    if (usuario) {
      const meses = (Date.now() - usuario.criadoEm.getTime()) / (1000 * 60 * 60 * 24 * 30);
      score += Math.min(100, Math.round(meses * 5));

      // 5. KYC aprovado (+200)
      if (usuario.kycStatus === "APROVADO") score += 200;
    }

    // 6. Penalidades de fraude — cada entrada reduz o score pelo valor absoluto armazenado
    const penalidade = scoreHistorico.reduce((acc, h) => acc + Math.abs(h.score), 0);
    score -= penalidade;

    return Math.min(1000, Math.max(0, score));
  }

  /**
   * Recalcula, persiste no histórico e notifica o usuário se a mudança for relevante.
   */
  async recalcularEAtualizar(usuarioId: string): Promise<number> {
    const novoScore = await this.calcularScore(usuarioId);

    const ultimo = await this.prisma.scoreHistorico.findFirst({
      where: { usuarioId, NOT: { motivo: { startsWith: "FRAUDE" } } },
      orderBy: { criadoEm: "desc" },
    });

    const scoreAnterior = ultimo?.score ?? novoScore;
    const delta = novoScore - scoreAnterior;

    if (!ultimo || Math.abs(delta) > 0) {
      await this.prisma.scoreHistorico.create({
        data: { usuarioId, score: novoScore, motivo: "Cálculo automático" },
      });
    }

    if (Math.abs(delta) >= DELTA_NOTIFICACAO) {
      const subiu = delta > 0;
      const nivel = this.obterNivel(novoScore);
      this.notificacoes
        .criar(
          usuarioId,
          "SCORE_ATUALIZADO" as never,
          `Score ${subiu ? "aumentou" : "diminuiu"}: ${novoScore} pts`,
          `Seu score de construtibilidade ${subiu ? "subiu" : "caiu"} ${Math.abs(delta)} pontos e agora é ${nivel.nivel} (${novoScore}).`,
          "/dashboard/score"
        )
        .catch((e) => this.logger.warn(`Erro ao notificar score: ${e}`));
    }

    return novoScore;
  }

  /**
   * Registra penalidade de fraude — reduz o score indiretamente via histórico.
   * O valor em `pontos` deve ser POSITIVO; será subtraído na leitura do score.
   */
  async penalizarFraude(usuarioId: string, motivo: string, pontos: number): Promise<void> {
    await this.prisma.scoreHistorico.create({
      data: {
        usuarioId,
        score: Math.abs(pontos),
        motivo: `FRAUDE_${motivo.toUpperCase().replace(/\s/g, "_")}`,
      },
    });
    this.logger.warn(`Score penalizado em ${pontos}pts para usuário ${usuarioId}: ${motivo}`);

    // Recalcula e notifica com o novo score (incluindo a penalidade)
    await this.recalcularEAtualizar(usuarioId);
  }

  async buscarScoreAtual(usuarioId: string) {
    return this.recalcularEAtualizar(usuarioId);
  }

  async buscarHistorico(usuarioId: string, limit = 12) {
    return this.prisma.scoreHistorico.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
      take: limit,
    });
  }

  obterNivel(score: number): { nivel: string; cor: string; descricao: string } {
    if (score >= 800)
      return { nivel: "Excelente", cor: "text-green-600", descricao: "Construtor confiável com histórico impecável" };
    if (score >= 650)
      return { nivel: "Bom", cor: "text-blue-600", descricao: "Histórico sólido de conclusão de obras" };
    if (score >= 450)
      return { nivel: "Regular", cor: "text-yellow-600", descricao: "Em construção (literal)" };
    return { nivel: "Iniciante", cor: "text-gray-600", descricao: "Primeiras obras — vamos construir histórico" };
  }
}
