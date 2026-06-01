import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async obterDashboard() {
    const [
      totalUsuarios,
      totalCreditos,
      totalObras,
      totalEtapas,
      creditosAtivos,
      obrasAtivas,
    ] = await Promise.all([
      this.prisma.usuario.count(),
      this.prisma.credito.count(),
      this.prisma.obra.count(),
      this.prisma.etapaObra.count(),
      this.prisma.credito.count({ where: { status: "ATIVO" } }),
      this.prisma.obra.count({ where: { status: { not: "CONCLUIDA" } } }),
    ]);

    const valorTotalCreditado = await this.prisma.credito.aggregate({
      _sum: { valorAprovado: true },
    });

    const valorTotalLiberado = await this.prisma.credito.aggregate({
      _sum: { valorLiberado: true },
    });

    return {
      usuarios: totalUsuarios,
      creditos: totalCreditos,
      creditosAtivos,
      obras: totalObras,
      obrasAtivas,
      etapas: totalEtapas,
      valorTotalCreditado: valorTotalCreditado._sum.valorAprovado || 0,
      valorTotalLiberado: valorTotalLiberado._sum.valorLiberado || 0,
    };
  }
}
