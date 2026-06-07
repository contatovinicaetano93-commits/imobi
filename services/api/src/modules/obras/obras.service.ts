import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CriarObraInput } from "@imbobi/schemas";
import { ETAPAS_PADRAO } from "./etapas-padrao";

@Injectable()
export class ObrasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(usuarioId: string, input: CriarObraInput) {
    return this.prisma.$transaction(async (tx) => {
      // Server-side GPS validation: coordinate range for Brazil + PostGIS within check
      if (input.geo?.latitude !== undefined && input.geo?.longitude !== undefined) {
        const lat = input.geo.latitude;
        const lon = input.geo.longitude;
        const BRAZIL_BOUNDS = { minLat: -34.0, maxLat: 5.3, minLon: -73.9, maxLon: -28.6 };
        if (
          lat < BRAZIL_BOUNDS.minLat || lat > BRAZIL_BOUNDS.maxLat ||
          lon < BRAZIL_BOUNDS.minLon || lon > BRAZIL_BOUNDS.maxLon
        ) {
          throw new BadRequestException('GPS inválido (fora dos limites do Brasil)');
        }
        const gpsValidation = await tx.$queryRaw<Array<{ dentro: boolean }>>`
          SELECT ST_Within(
            ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326),
            ST_MakeEnvelope(-73.9, -34.0, -28.6, 5.3, 4326)
          ) AS dentro
        `;
        if (!gpsValidation[0]?.dentro) {
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

  async buscar(usuario: { id: string; tipo: string }, obraId: string) {
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
    if (usuario.tipo !== "ADMIN" && obra.usuarioId !== usuario.id) throw new ForbiddenException();
    return obra;
  }

  async progressoGeral(usuario: { id: string; tipo: string }, obraId: string): Promise<number> {
    const obra = await this.prisma.obra.findUnique({ where: { obraId }, select: { usuarioId: true } });
    if (!obra) throw new NotFoundException("Obra não encontrada.");
    if (usuario.tipo !== "ADMIN" && obra.usuarioId !== usuario.id) throw new ForbiddenException();

    const etapas = await this.prisma.etapaObra.findMany({ where: { obraId } });
    const concluidas = etapas.filter((e) => e.status === "CONCLUIDA");
    const total = etapas.reduce((acc, e) => acc + Number(e.percentualObra), 0);
    const concluido = concluidas.reduce((acc, e) => acc + Number(e.percentualObra), 0);
    return total > 0 ? Math.round((concluido / total) * 100) : 0;
  }
}
