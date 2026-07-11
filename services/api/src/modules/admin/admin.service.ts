import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Contadores das filas operacionais — cards do centro de comando. */
  async filas() {
    const [documentosPendentes, obrasParaHomologar, tranchesParaLiberar] = await Promise.all([
      this.prisma.documento.count({ where: { status: "PENDENTE" } }),
      this.prisma.obra.count({ where: { etapa: "OBRA_CADASTRADA" } }),
      this.prisma.tranche.count({ where: { status: "VALIDADA_ENGENHEIRO" } }),
    ]);

    return { documentosPendentes, obrasParaHomologar, tranchesParaLiberar };
  }
}
