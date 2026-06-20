import { Injectable, ForbiddenException, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ETAPA_STATUS_MAP } from "../../common/constants";
import { isManagerRole } from "../../common/constants/manager-roles";

const CACHE_KEYS = {
  STATS: "manager:stats",
  // Normalized cache key generation to improve hit rate
  // Instead of JSON.stringify(filters) which varies by field order,
  // build key from individual filter values in consistent order
  ETAPAS_PENDENTES: (
    limit: number,
    offset: number,
    filters?: {
      status?: "todas" | "pendente" | "aprovada" | "rejeitada";
      dataInicio?: string;
      dataFim?: string;
      obraType?: string;
      priority?: "todas" | "urgente" | "intermediaria" | "normal";
      searchTerm?: string;
    }
  ) => {
    const status = filters?.status || "todas";
    const dataInicio = filters?.dataInicio || "";
    const dataFim = filters?.dataFim || "";
    const obraType = filters?.obraType || "";
    const priority = filters?.priority || "todas";
    const searchTerm = filters?.searchTerm || "";
    return `manager:etapas:${limit}:${offset}:${status}:${dataInicio}:${dataFim}:${obraType}:${priority}:${searchTerm}`;
  },
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
    if (!usuario || !isManagerRole(usuario.tipo)) {
      throw new ForbiddenException("Acesso negado. Apenas gestores podem acessar.");
    }
  }

  async listarEtapasPendentes(
    limit = 20,
    offset = 0,
    filters?: {
      status?: "todas" | "pendente" | "aprovada" | "rejeitada";
      dataInicio?: string;
      dataFim?: string;
      obraType?: string;
      priority?: "todas" | "urgente" | "intermediaria" | "normal";
      searchTerm?: string;
    }
  ) {
    const cacheKey = CACHE_KEYS.ETAPAS_PENDENTES(limit, offset, filters);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const where: Prisma.EtapaObraWhereInput = {};
    const dateFilter: Prisma.DateTimeFilter = {};

    // Status filter
    if (filters?.status && filters.status !== "todas") {
      where.status = ETAPA_STATUS_MAP[filters.status] || "AGUARDANDO_VISTORIA";
    } else if (!filters?.status) {
      where.status = "AGUARDANDO_VISTORIA";
    }
    // filters.status === "todas" → no status filter (return all statuses)

    // Date range filter
    if (filters?.dataInicio || filters?.dataFim) {
      if (filters.dataInicio) dateFilter.gte = new Date(filters.dataInicio);
      if (filters.dataFim) {
        const endDate = new Date(filters.dataFim);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.lte = endDate;
      }
      where.criadoEm = dateFilter;
    }

    // Obra type filter
    if (filters?.obraType) {
      where.obra = { tipo: filters.obraType };
    }

    // Search term filter (by obra name or usuario name)
    if (filters?.searchTerm?.trim()) {
      const mode = Prisma.QueryMode.insensitive;
      const searchOr: Prisma.EtapaObraWhereInput[] = [
        { obra: { is: { nome: { contains: filters.searchTerm, mode } } } },
        { obra: { is: { usuario: { is: { nome: { contains: filters.searchTerm, mode } } } } } },
      ];
      // Merge search with existing obra filters
      if (where.obra) {
        where.AND = [{ obra: where.obra }, { OR: searchOr }];
        delete where.obra;
      } else {
        where.OR = searchOr;
      }
    }

    // Priority filter (based on creation time)
    if (filters?.priority && filters.priority !== "todas") {
      const now = new Date();
      const cutoff12h = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      if (filters.priority === "urgente") {
        dateFilter.lte = cutoff24h;
      } else if (filters.priority === "intermediaria") {
        dateFilter.lte = cutoff12h;
        dateFilter.gt = cutoff24h;
      } else if (filters.priority === "normal") {
        dateFilter.gt = cutoff12h;
      }
      where.criadoEm = dateFilter;
    }

    const [etapas, total] = await Promise.all([
      this.prisma.etapaObra.findMany({
        where,
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
      this.prisma.etapaObra.count({ where }),
    ]);

    const filtered = etapas;
    const filteredTotal = total;

    const result = {
      etapas: filtered.map((e) => ({
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
      total: filteredTotal,
    };

    // Cache TTL: 120 seconds (matches controller CacheTTL decorator)
    await this.cacheManager.set(cacheKey, result, 120000);
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
    // Cache TTL: 120 seconds (matches controller CacheTTL decorator)
    await this.cacheManager.set(cacheKey, result, 120000);
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

  /** Visão agregada da operação — somente leitura (gestor IMOBI + investidor do fundo). */
  async obterCarteira() {
    const [obras, creditos] = await Promise.all([
      this.prisma.obra.findMany({
        where: { status: { not: "CANCELADA" } },
        include: {
          etapas: { orderBy: { ordem: "asc" } },
          credito: {
            select: {
              creditoId: true,
              valorAprovado: true,
              valorLiberado: true,
              status: true,
            },
          },
        },
        orderBy: { criadoEm: "desc" },
      }),
      this.prisma.credito.findMany({
        where: { status: { in: ["ATIVO", "SUSPENSO", "VENCIDO"] } },
        orderBy: { criadoEm: "desc" },
      }),
    ]);

    return {
      obras: obras.map((o) => ({
        id: o.obraId,
        nome: o.nome,
        status: o.status,
        geoLatitude: o.geoLatitude,
        geoLongitude: o.geoLongitude,
        raioValidacaoMetros: o.raioValidacaoMetros,
        endereco: o.endereco,
        credito: o.credito
          ? {
              id: o.credito.creditoId,
              valorAprovado: o.credito.valorAprovado,
              valorLiberado: o.credito.valorLiberado,
              status: o.credito.status,
            }
          : null,
        etapas: o.etapas.map((e) => ({
          id: e.etapaId,
          nome: e.nome,
          ordem: e.ordem,
          percentualObra: e.percentualObra,
          valorLiberacao: e.valorLiberacao,
          status: e.status,
        })),
      })),
      creditos: creditos.map((c) => ({
        id: c.creditoId,
        valorAprovado: c.valorAprovado,
        valorLiberado: c.valorLiberado,
        taxaMensal: c.taxaMensal,
        prazoMeses: c.prazoMeses,
        status: c.status,
      })),
    };
  }

  async obterEtapaAuditLog(etapaId: string, limit = 20, offset = 0) {
    const [auditLogs, total] = await Promise.all([
      this.prisma.etapaAuditLog.findMany({
        where: { etapaId },
        include: {
          usuario: { select: { usuarioId: true, nome: true, email: true } },
        },
        orderBy: { criadoEm: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.etapaAuditLog.count({ where: { etapaId } }),
    ]);

    return {
      logs: auditLogs.map((log) => ({
        auditId: log.auditId,
        acaoTipo: log.acaoTipo,
        gerenciador: log.usuario.nome,
        gerenciadorEmail: log.usuario.email,
        observacoes: log.observacoes,
        criadoEm: log.criadoEm,
      })),
      total,
    };
  }

  async obterKycAuditLog(kycDocumentoId: string, limit = 20, offset = 0) {
    const [auditLogs, total] = await Promise.all([
      this.prisma.kycAuditLog.findMany({
        where: { kycDocumentoId },
        include: {
          usuario: { select: { usuarioId: true, nome: true, email: true } },
        },
        orderBy: { criadoEm: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.kycAuditLog.count({ where: { kycDocumentoId } }),
    ]);

    return {
      logs: auditLogs.map((log) => ({
        auditId: log.auditId,
        acaoTipo: log.acaoTipo,
        gerenciador: log.usuario.nome,
        gerenciadorEmail: log.usuario.email,
        motivo: log.motivo,
        criadoEm: log.criadoEm,
      })),
      total,
    };
  }
}
