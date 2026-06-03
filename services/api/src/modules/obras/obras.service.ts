import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CriarObraInput } from "@imbobi/schemas";
import { ETAPAS_PADRAO } from "./etapas-padrao";

@Injectable()
export class ObrasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(usuarioId: string, input: CriarObraInput) {
    return this.prisma.$transaction(async (tx) => {
      // BUG-002: Server-side GPS validation using PostGIS
      if (input.geo?.latitude && input.geo?.longitude) {
        const gpsValidation = await tx.$queryRaw<Array<{ valid: boolean }>>`
          SELECT ST_IsValid(ST_GeomFromText('POINT(${input.geo.longitude} ${input.geo.latitude})', 4326)) AS valid
        `;
        if (!gpsValidation[0]?.valid) {
          throw new BadRequestException('GPS inválido (fora dos limites do Brasil)');
        }
      }

      const obra = await tx.obra.create({
        data: {
          usuarioId,
          creditoId: input.creditoId,
          nome: input.nome,
          endereco: typeof input.endereco === "string" ? input.endereco : JSON.stringify(input.endereco),
          geoLatitude: input.geo?.latitude ?? 0,
          geoLongitude: input.geo?.longitude ?? 0,
          raioValidacaoMetros: input.geo?.raioValidacaoMetros ?? 50,
          areaM2: input.areaM2,
        },
      });

      await tx.etapaObra.createMany({
        data: ETAPAS_PADRAO.map((e, i) => ({
          obraId: obra.obraId,
          nome: e.nome,
          ordem: i + 1,
          percentualObra: e.percentual,
          valorLiberacao: 0,
        })),
      });

      return tx.obra.findUnique({
        where: { obraId: obra.obraId },
        include: { etapas: { orderBy: { ordem: "asc" } } },
      });
    });
  }

  async listar(usuarioId: string) {
    return this.prisma.obra.findMany({
      where: { usuarioId },
      include: { etapas: { select: { etapaId: true, nome: true, status: true, ordem: true } } },
      orderBy: { criadoEm: "desc" },
    });
  }

  async buscar(usuarioId: string, obraId: string, usuarioTipo?: string) {
    const obra = await this.prisma.obra.findUnique({
      where: { obraId },
      include: {
        etapas: {
          orderBy: { ordem: "asc" },
          include: {
            evidencias: {
              where: { validada: true },
              select: { evidenciaId: true, fotoUrl: true, criadoEm: true },
              take: 3,
            },
          },
        },
        credito: { select: { creditoId: true, valorAprovado: true, valorLiberado: true, status: true } },
      },
    });
    if (!obra) throw new NotFoundException("Obra não encontrada.");
    // Gestores and admins can view any obra without ownership checks
    const isManager = usuarioTipo === "GESTOR_OBRA" || usuarioTipo === "ADMIN";
    if (!isManager && obra.usuarioId !== usuarioId) throw new ForbiddenException();
    return obra;
  }

  async progressoGeral(obraId: string): Promise<number> {
    const etapas = await this.prisma.etapaObra.findMany({ where: { obraId } });
    const concluidas = etapas.filter((e) => e.status === "CONCLUIDA");
    const total = etapas.reduce((acc, e) => acc + Number(e.percentualObra), 0);
    const concluido = concluidas.reduce((acc, e) => acc + Number(e.percentualObra), 0);
    return total > 0 ? Math.round((concluido / total) * 100) : 0;
  }
}
