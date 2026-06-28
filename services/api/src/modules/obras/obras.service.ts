import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, type EtapaStatus } from "@prisma/client";
import type { CriarObraInput } from "@imbobi/schemas";
import { ETAPAS_PADRAO } from "./etapas-padrao";
import { invalidateJornadaCache } from "../jornada/jornada-cache";
import { JornadaService } from "../jornada/jornada.service";

const ETAPAS_ENGENHEIRO: EtapaStatus[] = [
  "AGUARDANDO_VISTORIA",
  "EM_EXECUCAO",
  "CONCLUIDA",
  "REPROVADA",
];

@Injectable()
export class ObrasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jornada: JornadaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private isEngenheiro(tipo: string): boolean {
    return tipo === "ENGENHEIRO" || tipo === "GESTOR_OBRA";
  }

  private isTomador(tipo: string): boolean {
    return tipo === "TOMADOR" || tipo === "CONSTRUTOR";
  }

  private mapObraResumo(
    o: {
      obraId: string;
      nome: string;
      status: string;
      endereco: string;
      geoLatitude: number;
      geoLongitude: number;
      raioValidacaoMetros: number;
      etapas: Array<{
        etapaId: string;
        nome: string;
        status: string;
        ordem: number;
        percentualObra: unknown;
        valorLiberacao: unknown;
      }>;
      credito: {
        creditoId: string;
        valorAprovado: unknown;
        valorLiberado: unknown;
        status: string;
      } | null;
    },
  ) {
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
      credito: o.credito
        ? {
            id: o.credito.creditoId,
            valorAprovado: Number(o.credito.valorAprovado),
            valorLiberado: Number(o.credito.valorLiberado),
            status: o.credito.status,
          }
        : null,
      etapas: o.etapas.map((e) => ({
        id: e.etapaId,
        nome: e.nome,
        ordem: e.ordem,
        status: e.status,
        percentualObra: Number(e.percentualObra),
        valorLiberacao: Number(e.valorLiberacao),
      })),
    };
  }

  private async assertEngenheiroAcessoObra(obraId: string): Promise<void> {
    const count = await this.prisma.etapaObra.count({
      where: { obraId, status: { in: ETAPAS_ENGENHEIRO } },
    });
    if (count === 0) {
      throw new ForbiddenException("Obra fora do escopo de vistoria do engenheiro.");
    }
  }

  private async assertAcessoObra(usuario: { id: string; tipo: string }, obraId: string, ownerId: string) {
    if (usuario.tipo === "ADMIN") return;
    if (this.isEngenheiro(usuario.tipo)) {
      await this.assertEngenheiroAcessoObra(obraId);
      return;
    }
    if (ownerId !== usuario.id) {
      throw new ForbiddenException();
    }
  }

  async criar(usuarioId: string, tipo: string, input: CriarObraInput) {
    if (!this.isTomador(tipo)) {
      throw new ForbiddenException("Cadastro de obra é exclusivo do cliente tomador.");
    }

    await this.jornada.assertPodeCadastrarObra(usuarioId);

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
    }).then(async (result) => {
      if (result) await invalidateJornadaCache(this.cache, usuarioId);
      return result;
    });
  }

  async listar(usuarioId: string, tipo: string) {
    const include = {
      etapas: {
        select: {
          etapaId: true,
          nome: true,
          status: true,
          ordem: true,
          percentualObra: true,
          valorLiberacao: true,
        },
      },
      credito: {
        select: { creditoId: true, valorAprovado: true, valorLiberado: true, status: true },
      },
    } as const;

    const obras = this.isEngenheiro(tipo)
      ? await this.prisma.obra.findMany({
          where: {
            status: { in: ["EM_EXECUCAO", "CONCLUIDA"] },
            etapas: { some: { status: { in: ETAPAS_ENGENHEIRO } } },
          },
          include,
          orderBy: { atualizadoEm: "desc" },
          take: 50,
        })
      : await this.prisma.obra.findMany({
          where: { usuarioId },
          include,
          orderBy: { criadoEm: "desc" },
        });

    return obras.map((o) => this.mapObraResumo(o));
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

    await this.assertAcessoObra(usuario, obraId, obra.usuarioId);
    return obra;
  }

  async progressoGeral(usuario: { id: string; tipo: string }, obraId: string): Promise<number> {
    const obra = await this.prisma.obra.findUnique({ where: { obraId }, select: { usuarioId: true } });
    if (!obra) throw new NotFoundException("Obra não encontrada.");

    await this.assertAcessoObra(usuario, obraId, obra.usuarioId);

    const etapas = await this.prisma.etapaObra.findMany({ where: { obraId } });
    const concluidas = etapas.filter((e) => e.status === "CONCLUIDA");
    const total = etapas.reduce((acc, e) => acc + Number(e.percentualObra), 0);
    const concluido = concluidas.reduce((acc, e) => acc + Number(e.percentualObra), 0);
    return total > 0 ? Math.round((concluido / total) * 100) : 0;
  }
}
