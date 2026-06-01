import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../../cache.service";
import type { CriarObraInput } from "@imbobi/schemas";
import { ETAPAS_PADRAO } from "./etapas-padrao";

@Injectable()
export class ObrasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async criar(usuarioId: string, input: CriarObraInput) {
    const obra = await this.prisma.$transaction(async (tx) => {
      const novaObra = await tx.obra.create({
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
          obraId: novaObra.obraId,
          nome: e.nome,
          ordem: i + 1,
          percentualObra: e.percentual,
          valorLiberacao: 0,
        })),
      });

      return tx.obra.findUnique({
        where: { obraId: novaObra.obraId },
        include: { etapas: { orderBy: { ordem: "asc" } } },
      });
    });

    // Invalidate user obras list cache
    await this.cache.invalidateUserCache(usuarioId);
    return obra;
  }

  async listar(usuarioId: string) {
    const cacheKey = `user:${usuarioId}:obras`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const obras = await this.prisma.obra.findMany({
      where: { usuarioId },
      include: { etapas: { select: { etapaId: true, nome: true, status: true, ordem: true } } },
      orderBy: { criadoEm: "desc" },
    });

    // Cache por 2 minutos (low TTL pois pode estar mudando)
    await this.cache.set(cacheKey, obras, 120);
    return obras;
  }

  async buscar(usuarioId: string, obraId: string) {
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
    if (obra.usuarioId !== usuarioId) throw new ForbiddenException();
    return obra;
  }

  async progressoGeral(obraId: string): Promise<number> {
    const cacheKey = `obra:${obraId}:progresso`;
    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const etapas = await this.prisma.etapaObra.findMany({
      where: { obraId },
      select: { status: true, percentualObra: true },
    });

    const total = etapas.reduce((acc, e) => acc + Number(e.percentualObra), 0);
    const concluido = etapas
      .filter((e) => e.status === "CONCLUIDA")
      .reduce((acc, e) => acc + Number(e.percentualObra), 0);

    const progresso = total > 0 ? Math.round((concluido / total) * 100) : 0;

    // Cache por 1 minuto
    await this.cache.set(cacheKey, progresso, 60);
    return progresso;
  }
}
