import { Injectable, BadRequestException, UnprocessableEntityException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ScoreService } from "../score/score.service";
import type { SolicitacaoCreditoInput } from "@imbobi/schemas";

export interface DecisaoCredito {
  aprovado: boolean;
  valorAprovado: number;
  taxaMensal: number;
  prazoMeses: number;
  score: number;
  motivo?: string;
}

// Taxa a.m. decrescente conforme o score sobe (menor risco = menor custo)
const FAIXAS_TAXA: Array<{ minScore: number; taxaMensal: number; label: string }> = [
  { minScore: 800, taxaMensal: 0.0079, label: "Excelente" },  // ~9.8% a.a.
  { minScore: 650, taxaMensal: 0.0099, label: "Bom" },        // ~12.5% a.a.
  { minScore: 450, taxaMensal: 0.0129, label: "Regular" },    // ~16.7% a.a.
  { minScore: 0,   taxaMensal: 0.0159, label: "Iniciante" },  // ~21.0% a.a.
];

// Teto: 120× a renda mensal declarada (equivalente a 10 anos)
const MULTIPLICADOR_RENDA = 120;
// Score mínimo para aprovação
const SCORE_MINIMO = 400;

@Injectable()
export class CreditAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly score: ScoreService
  ) {}

  async analisar(usuarioId: string, input: SolicitacaoCreditoInput): Promise<DecisaoCredito> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { kycStatus: true },
    });

    if (!usuario) throw new BadRequestException("Usuário não encontrado.");

    // Gate 1: KYC obrigatório
    if (usuario.kycStatus !== "APROVADO") {
      throw new UnprocessableEntityException(
        "KYC não aprovado. Envie e valide seus documentos antes de solicitar crédito."
      );
    }

    // Gate 2: sem crédito ativo duplicado
    const creditoAtivo = await this.prisma.credito.findFirst({
      where: { usuarioId, status: "ATIVO" },
    });
    if (creditoAtivo) {
      throw new UnprocessableEntityException(
        "Você já possui um crédito ativo. Quite o contrato atual antes de solicitar um novo."
      );
    }

    const scoreAtual = await this.score.calcularScore(usuarioId);

    // Gate 3: score mínimo
    if (scoreAtual < SCORE_MINIMO) {
      return {
        aprovado: false,
        valorAprovado: 0,
        taxaMensal: 0,
        prazoMeses: input.prazoMeses,
        score: scoreAtual,
        motivo: `Score ${scoreAtual} abaixo do mínimo exigido (${SCORE_MINIMO}). Continue concluindo obras para melhorar seu histórico.`,
      };
    }

    // Teto pelo score (quanto maior o score, maior o multiplicador de renda)
    const fatorScore = Math.min(1, (scoreAtual - SCORE_MINIMO) / (1000 - SCORE_MINIMO));
    const multiplicadorEfetivo = Math.round(MULTIPLICADOR_RENDA * (0.5 + 0.5 * fatorScore));
    const tetoPorRenda = input.rendaMensalDeclarada * multiplicadorEfetivo;
    const valorAprovado = Math.min(input.valorSolicitado, tetoPorRenda);

    const faixa = FAIXAS_TAXA.find((f) => scoreAtual >= f.minScore) ?? FAIXAS_TAXA[FAIXAS_TAXA.length - 1];

    return {
      aprovado: true,
      valorAprovado,
      taxaMensal: faixa.taxaMensal,
      prazoMeses: input.prazoMeses,
      score: scoreAtual,
      motivo:
        valorAprovado < input.valorSolicitado
          ? `Valor ajustado para R$ ${valorAprovado.toLocaleString("pt-BR")} com base na renda declarada.`
          : undefined,
    };
  }
}
