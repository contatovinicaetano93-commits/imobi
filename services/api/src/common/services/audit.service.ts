import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import type { Prisma } from '@prisma/client';

export interface AuditInput {
  acao: string;
  entidade: string;
  entidadeId: string;
  usuarioId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await (client as any).auditLog.create({
      data: {
        acao: input.acao,
        entidade: input.entidade,
        entidadeId: input.entidadeId,
        usuarioId: input.usuarioId ?? null,
        ipAddress: input.ipAddress ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
