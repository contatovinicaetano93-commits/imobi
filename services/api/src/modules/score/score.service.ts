import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";

@Injectable()
export class ScoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Calcula score de construtibilidade (0-1000) baseado no histórico de obras.
   * Fatores:
   * - Obras concluídas no prazo: +200
   * - Taxa de conclusão média: +300
   * - Pagamento em dia: +200
   * - Tempo como cliente: +100
   * - Documentação validada (KYC): +200
   *
   * Otimizado: 1 query consolidada com relacionamentos (antes: 4 queries separadas)
   */
  async calcularScore(usuarioId: string): Promise<number> {
    return this.cacheService.obterScoreComCache(usuarioId, async () => {
      const usuario = await this.prisma.usuario.findUnique({
        where: { usuarioId },
        select: {
          criadoEm: true,
          kycStatus: true,
          obras: {
            select: { status: true },
          },
          creditos: {
            select: { status: true },
          },
        },
      });

      if (!usuario) return 0;

      let score = 600;
      const obras = usuario.obras;
      const creditos = usuario.creditos;

      // 1. Obras concluídas (+200)
      const obrasConcluidasNoPrazo = obras.filter((o) => o.status === "CONCLUIDA").length;
      if (obrasConcluidasNoPrazo > 0) score += Math.min(200, obrasConcluidasNoPrazo * 50);

      // 2. Taxa média de conclusão (+300)
      const taxaConclusao = obras.length > 0
        ? obras.filter((o) => o.status === "CONCLUIDA").length / obras.length
        : 0;
      score += Math.round(taxaConclusao * 300);

      // 3. Créditos sem atrasos (+200)
      const creditosSemAtraso = creditos.filter(
        (c) => c.status === "ATIVO" || c.status === "QUITADO"
      ).length;
      if (creditosSemAtraso > 0) score += Math.min(200, creditosSemAtraso * 100);

      // 4. Tempo como cliente (+100)
      const mesesComo = (Date.now() - usuario.criadoEm.getTime()) / (1000 * 60 * 60 * 24 * 30);
      score += Math.min(100, Math.round(mesesComo * 5));

      // 5. KYC aprovado (+200)
      if (usuario.kycStatus === "APROVADO") score += 200;

      return Math.min(1000, Math.max(0, score));
    });
  }

  async buscarScoreAtual(usuarioId: string) {
    const score = await this.calcularScore(usuarioId);
    // Registra no histórico
    await this.prisma.scoreHistorico.create({
      data: { usuarioId, score, motivo: "Cálculo automático" },
    });
    // Invalidate score history cache when new record is created
    await this.cacheService.invalidarHistoricoScore(usuarioId);
    return score;
  }

  async buscarHistorico(usuarioId: string, limit = 12) {
    return this.cacheService.obterHistoricoComCache(usuarioId, limit, async () => {
      return this.prisma.scoreHistorico.findMany({
        where: { usuarioId },
        orderBy: { criadoEm: "desc" },
        take: limit,
      });
    });
  }

  obterNivel(score: number): { nivel: string; cor: string; descricao: string } {
    if (score >= 800) return { nivel: "Excelente", cor: "text-green-600", descricao: "Construtor confiável com histórico impecável" };
    if (score >= 650) return { nivel: "Bom", cor: "text-blue-600", descricao: "Histórico sólido de conclusão de obras" };
    if (score >= 450) return { nivel: "Regular", cor: "text-yellow-600", descricao: "Em construção (literal)" };
    return { nivel: "Iniciante", cor: "text-gray-600", descricao: "Primeiras obras — vamos construir histórico" };
  }
}
