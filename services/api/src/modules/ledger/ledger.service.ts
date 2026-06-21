import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { LancamentoCategoria, LancamentoTipo, Prisma } from "@prisma/client";

export interface CriarLancamentoInput {
  tipo: LancamentoTipo;
  categoria: LancamentoCategoria;
  valor: number;
  creditoId?: string;
  liberacaoId?: string;
  usuarioId: string;
  descricao?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Cria um lançamento imutável no ledger (dentro ou fora de transação). */
  async criar(input: CriarLancamentoInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.lancamentoFinanceiro.create({
      data: {
        tipo: input.tipo,
        categoria: input.categoria,
        valor: input.valor,
        creditoId: input.creditoId,
        liberacaoId: input.liberacaoId,
        usuarioId: input.usuarioId,
        descricao: input.descricao,
        metadata: input.metadata as Prisma.InputJsonValue ?? undefined,
        idempotencyKey: input.idempotencyKey,
      },
    });
  }

  async saldoPorCredito(creditoId: string): Promise<number> {
    const result = await this.prisma.lancamentoFinanceiro.aggregate({
      where: { creditoId },
      _sum: { valor: true },
    });
    return Number(result._sum.valor ?? 0);
  }

  async extratoPorCredito(creditoId: string, take = 50) {
    return this.prisma.lancamentoFinanceiro.findMany({
      where: { creditoId },
      orderBy: { criadoEm: "desc" },
      take: Math.min(take, 200),
    });
  }

  async extratoPorUsuario(usuarioId: string, take = 50) {
    return this.prisma.lancamentoFinanceiro.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
      take: Math.min(take, 200),
    });
  }

  /** Cursor-based pagination — stable under concurrent inserts, efficient on large tables. */
  async extratoCursor(
    creditoId: string,
    cursor?: string,
    take = 20,
  ): Promise<{ data: any[]; nextCursor: string | undefined; hasMore: boolean }> {
    const limit = Math.min(take, 100);
    const items = await this.prisma.lancamentoFinanceiro.findMany({
      where: { creditoId },
      orderBy: { criadoEm: "desc" },
      take: limit + 1,
      ...(cursor
        ? { cursor: { lancamentoId: cursor }, skip: 1 }
        : {}),
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.lancamentoId : undefined;

    return { data, nextCursor, hasMore };
  }

  /** Verifica consistência: soma do ledger deve bater com valorLiberado do crédito. */
  async verificarConsistencia(creditoId: string): Promise<{ ok: boolean; divergencia: number }> {
    const [credito, somaLedger] = await Promise.all([
      this.prisma.credito.findUnique({ where: { creditoId }, select: { valorLiberado: true } }),
      this.saldoPorCredito(creditoId),
    ]);
    if (!credito) return { ok: false, divergencia: 0 };
    const divergencia = Number(credito.valorLiberado) - somaLedger;
    if (Math.abs(divergencia) > 0.01) {
      this.logger.error(`Divergência no ledger do crédito ${creditoId}: cache=${credito.valorLiberado} ledger=${somaLedger} diff=${divergencia}`);
    }
    return { ok: Math.abs(divergencia) <= 0.01, divergencia };
  }
}
