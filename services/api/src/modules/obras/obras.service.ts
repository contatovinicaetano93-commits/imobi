import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CriarObraInput } from "@imbobi/schemas";
import { ETAPAS_PADRAO } from "./etapas-padrao";

@Injectable()
export class ObrasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(usuarioId: string, input: CriarObraInput) {
    return this.prisma.$transaction(async (tx) => {
      const obra = await tx.obra.create({
        data: {
          usuarioId,
          creditoId: input.creditoId,
          nome: input.nome,
          enderecoJson: input.endereco,
          geoLatitude: input.geo.latitude,
          geoLongitude: input.geo.longitude,
          raioValidacaoMetros: input.geo.raioValidacaoMetros,
          areaM2: input.areaM2,
          dataInicio: input.datainicioISO ? new Date(input.datainicioISO) : null,
          dataConclusaoPrevista: new Date(input.dataConclusaoPrevistaISO),
        },
      });

      // Cria etapas padrão automaticamente
      await tx.etapaObra.createMany({
        data: ETAPAS_PADRAO.map((e, i) => ({
          obraId: obra.id,
          nome: e.nome,
          descricao: e.descricao,
          ordem: i + 1,
          percentualObra: e.percentual,
        })),
      });

      return tx.obra.findUnique({
        where: { id: obra.id },
        include: { etapas: { orderBy: { ordem: "asc" } } },
      });
    });
  }

  async listar(usuarioId: string) {
    return this.prisma.obra.findMany({
      where: { usuarioId },
      include: { etapas: { select: { id: true, nome: true, status: true, ordem: true } } },
      orderBy: { criadoEm: "desc" },
    });
  }

  async buscar(usuarioId: string, obraId: string) {
    const obra = await this.prisma.obra.findUnique({
      where: { id: obraId },
      include: {
        etapas: {
          orderBy: { ordem: "asc" },
          include: {
            evidencias: {
              where: { validada: true },
              select: { id: true, fotoUrl: true, criadoEm: true },
              take: 3,
            },
          },
        },
        credito: { select: { id: true, valorAprovado: true, valorLiberado: true, status: true } },
      },
    });
    if (!obra) throw new NotFoundException("Obra não encontrada.");
    if (obra.usuarioId !== usuarioId) throw new ForbiddenException();
    return obra;
  }

  async progressoGeral(obraId: string): Promise<number> {
    const etapas = await this.prisma.etapaObra.findMany({ where: { obraId } });
    const aprovadas = etapas.filter((e) => e.status === "APROVADA");
    const total = etapas.reduce((acc, e) => acc + Number(e.percentualObra), 0);
    const concluido = aprovadas.reduce((acc, e) => acc + Number(e.percentualObra), 0);
    return total > 0 ? Math.round((concluido / total) * 100) : 0;
  }
}
