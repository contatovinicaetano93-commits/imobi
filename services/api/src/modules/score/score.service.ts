import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../../cache.service";

@Injectable()
export class ScoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Calcula score de construtibilidade (0-1000) baseado no histórico de obras.
   * Fatores:
   * - Obras concluídas no prazo: +200
   * - Taxa de conclusão média: +300
   * - Pagamento em dia: +200
   * - Tempo como cliente: +100
   * - Documentação validada (KYC): +200
   */
  async calcularScore(usuarioId: string): Promise<number> {
    const [obras, creditos] = await Promise.all([
      this.prisma.obra.findMany({ where: { usuarioId } }),
      this.prisma.credito.findMany({ where: { usuarioId } }),
    ]);

    let score = 600; // Base mínima para usuário novo

    // 1. Obras concluídas (+200)
    const obrasConcluidasNoPrazo = obras.filter(
      (o) => o.status === "CONCLUIDA",
    ).length;
    if (obrasConcluidasNoPrazo > 0)
      score += Math.min(200, obrasConcluidasNoPrazo * 50);

    // 2. Taxa média de conclusão (+300)
    const taxaConclusao =
      obras.length > 0
        ? obras.filter((o) => o.status === "CONCLUIDA").length / obras.length
        : 0;
    score += Math.round(taxaConclusao * 300);

    // 3. Créditos sem atrasos (+200)
    const creditosSemAtraso = creditos.filter(
      (c) => c.status === "ATIVO" || c.status === "QUITADO",
    ).length;
    if (creditosSemAtraso > 0) score += Math.min(200, creditosSemAtraso * 100);

    // 4. Tempo como cliente (+100)
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { criadoEm: true },
    });
    if (usuario) {
      const mesesComo =
        (Date.now() - usuario.criadoEm.getTime()) / (1000 * 60 * 60 * 24 * 30);
      score += Math.min(100, Math.round(mesesComo * 5));
    }

    // 5. KYC aprovado (+200)
    const kyc = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { kycStatus: true },
    });
    if (kyc?.kycStatus === "APROVADO") score += 200;

    return Math.min(1000, Math.max(0, score));
  }

  async buscarScoreAtual(usuarioId: string) {
    const cacheKey = `score:${usuarioId}`;
    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const score = await this.calcularScore(usuarioId);
    // Registra no histórico
    await this.prisma.scoreHistorico.create({
      data: { usuarioId, score, motivo: "Cálculo automático" },
    });

    // Cache por 10 minutos
    await this.cache.set(cacheKey, score, 600);
    return score;
  }

  async recalcularScore(usuarioId: string) {
    const cacheKey = `score:${usuarioId}`;
    const score = await this.calcularScore(usuarioId);

    // Registra no histórico com motivo de recálculo automático
    await this.prisma.scoreHistorico.create({
      data: { usuarioId, score, motivo: "Recálculo automático diário" },
    });

    // Invalida cache para forçar recálculo próximo acesso
    await this.cache.delete(cacheKey);

    return score;
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
      return {
        nivel: "Excelente",
        cor: "text-green-600",
        descricao: "Construtor confiável com histórico impecável",
      };
    if (score >= 650)
      return {
        nivel: "Bom",
        cor: "text-blue-600",
        descricao: "Histórico sólido de conclusão de obras",
      };
    if (score >= 450)
      return {
        nivel: "Regular",
        cor: "text-yellow-600",
        descricao: "Em construção (literal)",
      };
    return {
      nivel: "Iniciante",
      cor: "text-gray-600",
      descricao: "Primeiras obras — vamos construir histórico",
    };
  }
}
