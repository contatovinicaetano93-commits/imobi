import { Injectable, ForbiddenException, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { PrismaService } from "../prisma/prisma.service";

const CACHE_KEYS = {
  STATS: "manager:stats",
  ETAPAS_PENDENTES: (limit: number, offset: number) => `manager:etapas:${limit}:${offset}`,
  KYC_PENDENTES: (limit: number, offset: number) => `manager:kyc:${limit}:${offset}`,
};

@Injectable()
export class ManagerService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async verificarPermissao(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
    });
    if (!usuario || (usuario.tipo !== "GESTOR_OBRA" && usuario.tipo !== "ADMIN")) {
      throw new ForbiddenException("Acesso negado. Apenas gestores podem acessar.");
    }
  }

  async listarEtapasPendentes(limit = 20, offset = 0) {
    const cacheKey = CACHE_KEYS.ETAPAS_PENDENTES(limit, offset);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const [etapas, total] = await Promise.all([
      this.prisma.etapaObra.findMany({
        where: { status: "AGUARDANDO_VISTORIA" },
        include: {
          obra: {
            include: {
              usuario: { select: { usuarioId: true, nome: true, email: true, cpf: true } },
              credito: true,
            },
          },
          evidencias: {
            where: { validada: true },
            select: { evidenciaId: true, fotoUrl: true, criadoEm: true },
          },
        },
        orderBy: { criadoEm: "asc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.etapaObra.count({
        where: { status: "AGUARDANDO_VISTORIA" },
      }),
    ]);

    const result = {
      etapas: etapas.map((e) => ({
        etapaId: e.etapaId,
        nome: e.nome,
        ordem: e.ordem,
        percentualObra: e.percentualObra,
        valorLiberacao: e.valorLiberacao,
        evidenciasCount: e.evidencias.length,
        criadoEm: e.criadoEm,
        obra: {
          obraId: e.obra.obraId,
          nome: e.obra.nome,
          endereco: e.obra.endereco,
          usuario: e.obra.usuario,
          credito: e.obra.credito && {
            creditoId: e.obra.credito.creditoId,
            valorAprovado: e.obra.credito.valorAprovado,
          },
        },
      })),
      total,
    };

    await this.cacheManager.set(cacheKey, result, 300000);
    return result;
  }

  async listarKycPendentes(limit = 20, offset = 0) {
    const cacheKey = CACHE_KEYS.KYC_PENDENTES(limit, offset);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const [documentos, total] = await Promise.all([
      this.prisma.kycDocumento.findMany({
        where: { status: "PENDENTE" },
        include: {
          usuario: {
            select: {
              usuarioId: true,
              nome: true,
              email: true,
              cpf: true,
              kycStatus: true,
            },
          },
        },
        orderBy: { criadoEm: "asc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.kycDocumento.count({
        where: { status: "PENDENTE" },
      }),
    ]);

    const result = { documentos, total };
    await this.cacheManager.set(cacheKey, result, 300000);
    return result;
  }

  async obterEtapaDetalhe(etapaId: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: {
        obra: {
          include: {
            usuario: { select: { usuarioId: true, nome: true, email: true, cpf: true } },
            credito: true,
          },
        },
        evidencias: {
          where: { validada: true },
          include: { etapa: { select: { nome: true } } },
        },
      },
    });

    if (!etapa) return null;

    return {
      ...etapa,
      valorLiberacao: Number(etapa.valorLiberacao),
      obra: {
        ...etapa.obra,
        credito: etapa.obra.credito && {
          ...etapa.obra.credito,
          valorAprovado: Number(etapa.obra.credito.valorAprovado),
          valorLiberado: Number(etapa.obra.credito.valorLiberado),
        },
      },
    };
  }

  async obterKycDetalhe(kycDocumentoId: string) {
    return this.prisma.kycDocumento.findUnique({
      where: { kycDocumentoId },
      include: {
        usuario: {
          select: {
            usuarioId: true,
            nome: true,
            email: true,
            cpf: true,
            kycStatus: true,
            criadoEm: true,
          },
        },
      },
    });
  }

  async obterEstatisticas() {
    const cacheKey = CACHE_KEYS.STATS;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const [etapasPendentes, kycPendentes, creditosAtivos, obrasAtivas] = await Promise.all([
      this.prisma.etapaObra.count({ where: { status: "AGUARDANDO_VISTORIA" } }),
      this.prisma.kycDocumento.count({ where: { status: "PENDENTE" } }),
      this.prisma.credito.count({ where: { status: "ATIVO" } }),
      this.prisma.obra.count({ where: { status: "EM_EXECUCAO" } }),
    ]);

    const result = {
      filaAprovacoes: etapasPendentes,
      filaKyc: kycPendentes,
      creditosAtivos,
      obrasAtivas,
    };

    await this.cacheManager.set(cacheKey, result, 60000);
    return result;
  }

  async validarEtapaAprovacao(etapaId: string): Promise<{ valida: boolean; motivo?: string }> {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { evidencias: { where: { validada: true } } },
    });

    if (!etapa) return { valida: false, motivo: "Etapa não encontrada" };
    if (etapa.status !== "AGUARDANDO_VISTORIA") {
      return { valida: false, motivo: "Etapa não está aguardando vistoria" };
    }
    if (etapa.evidencias.length === 0) {
      return { valida: false, motivo: "Etapa precisa ter ao menos uma evidência validada" };
    }

    return { valida: true };
  }
}
