import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { VistoriaStatus } from "@prisma/client";
import { CacheService } from "../cache/cache.service";

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // ─── Contractor Management ───────────────────────────────────────

  async criarParceiro(usuarioId: string, data: {
    descricao?: string;
    especialidades: string[];
    telefone?: string;
    endereco?: string;
  }) {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { usuarioId },
    });

    if (!usuarioExistente) {
      throw new NotFoundException("Usuário não encontrado");
    }

    const parceiroExistente = await this.prisma.parceiro.findUnique({
      where: { usuarioId },
    });

    if (parceiroExistente) {
      throw new BadRequestException("Usuário já é um parceiro");
    }

    const parceiro = await this.prisma.parceiro.create({
      data: {
        usuarioId,
        descricao: data.descricao,
        especialidades: data.especialidades,
        telefone: data.telefone,
        endereco: data.endereco,
      },
      include: {
        usuario: {
          select: { nome: true, email: true, cpf: true },
        },
      },
    });

    await this.invalidarCacheParceiros();
    return parceiro;
  }

  async obterParceiro(parceiroId: string) {
    const parceiro = await this.prisma.parceiro.findUnique({
      where: { parceiroId },
      include: {
        usuario: {
          select: { nome: true, email: true, cpf: true, telefone: true },
        },
        servicos: true,
        avaliacoes: {
          include: {
            usuario: { select: { nome: true } },
          },
          orderBy: { criadoEm: "desc" },
          take: 5,
        },
      },
    });

    if (!parceiro) {
      throw new NotFoundException("Parceiro não encontrado");
    }

    return parceiro;
  }

  async listarParceiros(filtros?: {
    especialidade?: string;
    minAvaliacao?: number;
    limite?: number;
    offset?: number;
  }) {
    const { especialidade, minAvaliacao = 0, limite = 20, offset = 0 } = filtros || {};

    const cacheKey = CacheService.KEYS.PARCEIROS_LIST(
      especialidade || "all",
      minAvaliacao,
    );

    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) {
      return cached.slice(offset, offset + limite);
    }

    const where: any = {
      ativo: true,
      mediaAvaliacao: { gte: minAvaliacao },
    };

    if (especialidade) {
      where.especialidades = { has: especialidade };
    }

    const parceiros = await this.prisma.parceiro.findMany({
      where,
      include: {
        usuario: { select: { nome: true, email: true } },
        servicos: { where: { ativo: true } },
      },
      orderBy: { mediaAvaliacao: "desc" },
    });

    await this.cache.set(cacheKey, parceiros, CacheService.TTL.MEDIUM);

    return parceiros.slice(offset, offset + limite);
  }

  async atualizarParceiro(
    parceiroId: string,
    usuarioId: string,
    data: Partial<{
      descricao: string;
      especialidades: string[];
      telefone: string;
      endereco: string;
      ativo: boolean;
    }>,
  ) {
    const parceiro = await this.prisma.parceiro.findUnique({
      where: { parceiroId },
    });

    if (!parceiro) {
      throw new NotFoundException("Parceiro não encontrado");
    }

    if (parceiro.usuarioId !== usuarioId) {
      throw new BadRequestException("Sem permissão para atualizar este parceiro");
    }

    const parceiroAtualizado = await this.prisma.parceiro.update({
      where: { parceiroId },
      data,
      include: { usuario: { select: { nome: true, email: true } } },
    });

    await this.invalidarCacheParceiros();
    return parceiroAtualizado;
  }

  // ─── Service Management ───────────────────────────────────────

  async criarServico(parceiroId: string, usuarioId: string, data: {
    nome: string;
    descricao?: string;
    preco: number;
    estimadoHoras?: number;
  }) {
    const parceiro = await this.prisma.parceiro.findUnique({
      where: { parceiroId },
    });

    if (!parceiro || parceiro.usuarioId !== usuarioId) {
      throw new BadRequestException("Sem permissão para criar serviço");
    }

    const servico = await this.prisma.servicoOferece.create({
      data: {
        parceiroId,
        nome: data.nome,
        descricao: data.descricao,
        preco: data.preco,
        estimadoHoras: data.estimadoHoras,
      },
    });

    await this.invalidarCacheParceiros();
    return servico;
  }

  async listarServicos(parceiroId: string) {
    return this.prisma.servicoOferece.findMany({
      where: { parceiroId, ativo: true },
      orderBy: { nome: "asc" },
    });
  }

  // ─── Inspection/Booking Management ───────────────────────────────

  async agendarVistoria(data: {
    etapaId: string;
    parceiroId: string;
    servicoId?: string;
    precoAcordado?: number;
    dataAgendada?: Date;
  }) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId: data.etapaId },
    });

    if (!etapa) {
      throw new NotFoundException("Etapa não encontrada");
    }

    const parceiro = await this.prisma.parceiro.findUnique({
      where: { parceiroId: data.parceiroId },
    });

    if (!parceiro) {
      throw new NotFoundException("Parceiro não encontrado");
    }

    // Check if already has a scheduled inspection
    const vistoriaExistente = await this.prisma.vistoria.findFirst({
      where: {
        etapaId: data.etapaId,
        status: { not: "CANCELADA" },
      },
    });

    if (vistoriaExistente) {
      throw new BadRequestException("Esta etapa já tem uma vistoria agendada");
    }

    const vistoria = await this.prisma.vistoria.create({
      data: {
        etapaId: data.etapaId,
        parceiroId: data.parceiroId,
        servicoId: data.servicoId,
        precoAcordado: data.precoAcordado,
        dataAgendada: data.dataAgendada,
        status: VistoriaStatus.AGENDADA,
      },
      include: {
        etapa: { select: { nome: true, obraId: true } },
        parceiro: { include: { usuario: { select: { nome: true, email: true } } } },
      },
    });

    await this.invalidarCacheEtapa(data.etapaId);
    return vistoria;
  }

  async obterVistoria(vistoriaId: string) {
    const vistoria = await this.prisma.vistoria.findUnique({
      where: { vistoriaId },
      include: {
        etapa: {
          include: {
            obra: { select: { nome: true, endereco: true } },
          },
        },
        parceiro: { include: { usuario: { select: { nome: true, email: true } } } },
        servico: true,
      },
    });

    if (!vistoria) {
      throw new NotFoundException("Vistoria não encontrada");
    }

    return vistoria;
  }

  async atualizarStatusVistoria(
    vistoriaId: string,
    parceiroId: string,
    novoStatus: VistoriaStatus,
    observacao?: string,
  ) {
    const vistoria = await this.prisma.vistoria.findUnique({
      where: { vistoriaId },
    });

    if (!vistoria) {
      throw new NotFoundException("Vistoria não encontrada");
    }

    if (vistoria.parceiroId !== parceiroId) {
      throw new BadRequestException("Sem permissão para atualizar esta vistoria");
    }

    const vistoriaAtualizada = await this.prisma.vistoria.update({
      where: { vistoriaId },
      data: {
        status: novoStatus,
        observacao: observacao || vistoria.observacao,
        dataRealizada: novoStatus === VistoriaStatus.CONCLUIDA ? new Date() : null,
      },
      include: {
        etapa: true,
        parceiro: true,
      },
    });

    await this.invalidarCacheEtapa(vistoria.etapaId);
    return vistoriaAtualizada;
  }

  async listarVistoriasParceiro(parceiroId: string, filtros?: {
    status?: VistoriaStatus;
    limite?: number;
    offset?: number;
  }) {
    const { status, limite = 20, offset = 0 } = filtros || {};

    const where: any = { parceiroId };
    if (status) where.status = status;

    const vistorias = await this.prisma.vistoria.findMany({
      where,
      include: {
        etapa: { include: { obra: true } },
        servico: true,
      },
      orderBy: { dataAgendada: "desc" },
      skip: offset,
      take: limite,
    });

    return vistorias;
  }

  async listarVistoriasEtapa(etapaId: string) {
    return this.prisma.vistoria.findMany({
      where: { etapaId },
      include: {
        parceiro: { include: { usuario: { select: { nome: true, email: true } } } },
        servico: true,
      },
      orderBy: { criadoEm: "desc" },
    });
  }

  // ─── Review Management ───────────────────────────────────────

  async avaliarParceiro(data: {
    parceiroId: string;
    vistoriaId?: string;
    usuarioId: string;
    estrelas: number;
    comentario?: string;
  }) {
    if (data.estrelas < 1 || data.estrelas > 5) {
      throw new BadRequestException("Avaliação deve ser entre 1 e 5 estrelas");
    }

    const parceiro = await this.prisma.parceiro.findUnique({
      where: { parceiroId: data.parceiroId },
    });

    if (!parceiro) {
      throw new NotFoundException("Parceiro não encontrado");
    }

    const avaliacao = await this.prisma.avaliacaoParceiro.upsert({
      where: {
        parceiroId_vistoriaId_usuarioId: {
          parceiroId: data.parceiroId,
          vistoriaId: data.vistoriaId || null,
          usuarioId: data.usuarioId,
        },
      },
      create: data,
      update: { estrelas: data.estrelas, comentario: data.comentario },
    });

    // Recalculate contractor's average rating
    await this.recalcularMediaAvaliacao(data.parceiroId);

    return avaliacao;
  }

  async listarAvaliacoesParceiro(parceiroId: string, limite = 10) {
    return this.prisma.avaliacaoParceiro.findMany({
      where: { parceiroId },
      include: {
        usuario: { select: { nome: true, email: true } },
      },
      orderBy: { criadoEm: "desc" },
      take: limite,
    });
  }

  async recalcularMediaAvaliacao(parceiroId: string) {
    const avaliacoes = await this.prisma.avaliacaoParceiro.findMany({
      where: { parceiroId },
      select: { estrelas: true },
    });

    const media = avaliacoes.length > 0
      ? avaliacoes.reduce((sum, a) => sum + a.estrelas, 0) / avaliacoes.length
      : 0;

    await this.prisma.parceiro.update({
      where: { parceiroId },
      data: {
        mediaAvaliacao: parseFloat(media.toFixed(2)),
        totalAvaliacoes: avaliacoes.length,
      },
    });

    await this.invalidarCacheParceiros();
  }

  // ─── Cache Helpers ───────────────────────────────────────────

  private async invalidarCacheParceiros() {
    await this.cache.invalidatePattern("parceiros:");
  }

  private async invalidarCacheEtapa(etapaId: string) {
    await this.cache.invalidate(CacheService.KEYS.OBRA_DETAIL(etapaId));
  }
}
