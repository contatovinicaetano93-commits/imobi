import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export enum AcaoAudit {
  ETAPA_APROVADA = "ETAPA_APROVADA",
  ETAPA_REJEITADA = "ETAPA_REJEITADA",
  KYC_APROVADO = "KYC_APROVADO",
  KYC_REJEITADO = "KYC_REJEITADO",
  CREDITO_APROVADO = "CREDITO_APROVADO",
  CREDITO_REJEITADO = "CREDITO_REJEITADO",
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(
    gestorId: string,
    acao: AcaoAudit,
    entidade: string,
    entidadeId: string,
    dados?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.prisma.auditLog.create({
      data: {
        gestorId,
        acao,
        entidade,
        entidadeId,
        dados,
        ipAddress,
        userAgent,
      },
    });
  }

  async listarPorGestor(gestorId: string, limit = 50, offset = 0) {
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { gestorId },
        orderBy: { criadoEm: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where: { gestorId } }),
    ]);

    return { logs, total };
  }

  async listarPorEntidade(entidade: string, entidadeId: string) {
    return this.prisma.auditLog.findMany({
      where: { entidade, entidadeId },
      orderBy: { criadoEm: "desc" },
    });
  }
}
