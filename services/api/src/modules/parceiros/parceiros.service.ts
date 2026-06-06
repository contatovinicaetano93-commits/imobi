import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ParceirosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros?: { kycStatus?: string; page?: number; limit?: number }) {
    const page = filtros?.page ?? 1;
    const limit = filtros?.limit ?? 20;

    const [parceiros, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where: {
          tipo: "PARCEIRO",
          ...(filtros?.kycStatus && { kycStatus: filtros.kycStatus as never }),
        },
        select: {
          usuarioId: true,
          nome: true,
          email: true,
          telefone: true,
          kycStatus: true,
          criadoEm: true,
        },
        orderBy: { criadoEm: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.usuario.count({ where: { tipo: "PARCEIRO" } }),
    ]);

    return { parceiros, total, page, limit };
  }

  async buscar(usuarioId: string) {
    return this.prisma.usuario.findFirst({
      where: { usuarioId, tipo: "PARCEIRO" },
      select: {
        usuarioId: true,
        nome: true,
        email: true,
        telefone: true,
        kycStatus: true,
        criadoEm: true,
        leads: {
          select: { leadId: true, status: true, criadoEm: true },
          orderBy: { criadoEm: "desc" },
          take: 10,
        },
      },
    });
  }

  async aprovar(usuarioId: string) {
    return this.prisma.usuario.update({
      where: { usuarioId },
      data: { kycStatus: "APROVADO" as never },
      select: { usuarioId: true, nome: true, kycStatus: true },
    });
  }

  async suspender(usuarioId: string) {
    return this.prisma.usuario.update({
      where: { usuarioId },
      data: { kycStatus: "PENDENTE" as never },
      select: { usuarioId: true, nome: true, kycStatus: true },
    });
  }

  async estatisticas() {
    const [total, aprovados, pendentes] = await Promise.all([
      this.prisma.usuario.count({ where: { tipo: "PARCEIRO" } }),
      this.prisma.usuario.count({ where: { tipo: "PARCEIRO", kycStatus: "APROVADO" } }),
      this.prisma.usuario.count({ where: { tipo: "PARCEIRO", kycStatus: "PENDENTE" } }),
    ]);
    return { total, aprovados, pendentes };
  }
}
