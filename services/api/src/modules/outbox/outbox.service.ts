import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type OutboxEventTipo =
  | "LIBERACAO_PARCELA"
  | "ETAPA_APROVADA"
  | "KYC_APROVADO"
  | "KYC_REJEITADO"
  | "WEBHOOK_EMIT";

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  /** Enfileira evento dentro de uma transação existente — garante atomicidade. */
  async enfileirar(
    tipo: OutboxEventTipo,
    payload: Record<string, unknown>,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.outboxEvent.create({
      data: { tipo, payload: payload as Prisma.InputJsonValue },
    });
  }

  async buscarPendentes(limit = 50) {
    return this.prisma.outboxEvent.findMany({
      where: { status: "PENDENTE", agendadoPara: { lte: new Date() } },
      orderBy: { criadoEm: "asc" },
      take: limit,
    });
  }

  async marcarProcessando(eventId: string) {
    return this.prisma.outboxEvent.update({
      where: { eventId },
      data: { status: "PROCESSANDO" },
    });
  }

  async marcarConcluido(eventId: string) {
    return this.prisma.outboxEvent.update({
      where: { eventId },
      data: { status: "CONCLUIDO", processadoEm: new Date() },
    });
  }

  async marcarFalha(eventId: string, erro: string, tentativas: number, retentar = true) {
    const delay = Math.min(tentativas * 30_000, 600_000);
    return this.prisma.outboxEvent.update({
      where: { eventId },
      data: {
        status: retentar && tentativas < 5 ? "PENDENTE" : "FALHA",
        tentativas,
        erro,
        agendadoPara: new Date(Date.now() + delay),
      },
    });
  }
}
