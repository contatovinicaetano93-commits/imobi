import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CriarObraInput } from "@imbobi/schemas";
import { ETAPAS_PADRAO } from "./etapas-padrao";

@Injectable()
export class ObrasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(usuarioId: string, input: CriarObraInput) {
    return this.prisma.$transaction(async (tx) => {
      if (input.geo != null) {
        const gpsValidation = await tx.$queryRaw<Array<{ valid: boolean }>>(
          Prisma.sql`SELECT ST_IsValid(ST_SetSRID(ST_MakePoint(${input.geo.longitude}, ${input.geo.latitude}), 4326)) AS valid`
        );
        if (!gpsValidation[0]?.valid) {
          throw new BadRequestException('GPS inválido');
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
    const obras = await this.prisma.obra.findMany({
      where: { usuarioId },
      include: {
        etapas: {
          select: {
            etapaId: true, nome: true, status: true, ordem: true,
            percentualObra: true, valorLiberacao: true,
          },
        },
        credito: {
          select: { creditoId: true, valorAprovado: true, valorLiberado: true, status: true },
        },
      },
      orderBy: { criadoEm: "desc" },
    });

    return obras.map((o) => {
      const totalPct = o.etapas.reduce((acc, e) => acc + Number(e.percentualObra), 0);
      const concluidoPct = o.etapas
        .filter((e) => e.status === "CONCLUIDA")
        .reduce((acc, e) => acc + Number(e.percentualObra), 0);
      const progresso = totalPct > 0 ? Math.round((concluidoPct / totalPct) * 100) : 0;

      return {
        id: o.obraId,
        nome: o.nome,
        status: o.status,
        endereco: o.endereco,
        geoLatitude: o.geoLatitude,
        geoLongitude: o.geoLongitude,
        raioValidacaoMetros: o.raioValidacaoMetros,
        progresso,
        credito: o.credito ? {
          id: o.credito.creditoId,
          valorAprovado: Number(o.credito.valorAprovado),
          valorLiberado: Number(o.credito.valorLiberado),
          status: o.credito.status,
        } : null,
        etapas: o.etapas.map((e) => ({
          id: e.etapaId,
          nome: e.nome,
          ordem: e.ordem,
          status: e.status,
          percentualObra: Number(e.percentualObra),
          valorLiberacao: Number(e.valorLiberacao),
        })),
      };
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
    const privileged = usuario.tipo === "ADMIN" || usuario.tipo === "GESTOR";
    if (!privileged && obra.usuarioId !== usuario.id) throw new ForbiddenException();
    return obra;
  }

  async progressoGeral(usuario: { id: string; tipo: string }, obraId: string): Promise<number> {
    const obra = await this.prisma.obra.findUnique({ where: { obraId }, select: { usuarioId: true } });
    if (!obra) throw new NotFoundException("Obra não encontrada.");
    const privileged = usuario.tipo === "ADMIN" || usuario.tipo === "GESTOR";
    if (!privileged && obra.usuarioId !== usuario.id) throw new ForbiddenException();

    const etapas = await this.prisma.etapaObra.findMany({ where: { obraId } });
    const concluidas = etapas.filter((e) => e.status === "CONCLUIDA");
    const total = etapas.reduce((acc, e) => acc + Number(e.percentualObra), 0);
    const concluido = concluidas.reduce((acc, e) => acc + Number(e.percentualObra), 0);
    return total > 0 ? Math.round((concluido / total) * 100) : 0;
  }
}
