import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";
import { Prisma } from "@prisma/client";

interface BulkKycApprovalDto {
  documentIds: string[];
  adminId: string;
}

interface BulkKycRejectionDto {
  documentIds: string[];
  motivo: string;
  adminId: string;
}

interface BlockUserDto {
  usuarioId: string;
  adminId: string;
  motivo?: string;
}

interface UnblockUserDto {
  usuarioId: string;
  adminId: string;
}

interface CreditApprovalDto {
  creditoId: string;
  adminId: string;
  valorAprovado: number;
  prazoMeses: number;
  taxaMensal?: number;
}

interface CreditRejectionDto {
  creditoId: string;
  adminId: string;
  motivo: string;
}

interface StageApprovalDto {
  etapaIds: string[];
  adminId: string;
}

interface AdminStatsDto {
  totalUsuarios: number;
  usuariosBloqueados: number;
  kycPendentes: number;
  creditosPendentes: number;
  etapasPendentes: number;
  ultimaAtualização: Date;
}

interface UserListDto {
  usuarioId: string;
  nome: string;
  email: string;
  tipo: string;
  kycStatus: string;
  bloqueado: boolean;
  criadoEm: Date;
}

interface KycPendingDto {
  kycDocumentoId: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
  tipo: string;
  url: string;
  status: string;
  criadoEm: Date;
  motivo_rejeicao?: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── User Management ──────────────────────────────────────

  async listUsers(
    page: number = 1,
    limit: number = 20,
    filtro?: { tipo?: string; bloqueado?: boolean; kycStatus?: string },
  ): Promise<{ data: UserListDto[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const whereClause: Prisma.UsuarioWhereInput = {};
    if (filtro?.tipo) whereClause.tipo = filtro.tipo;
    if (filtro?.bloqueado !== undefined) whereClause.bloqueado = filtro.bloqueado;
    if (filtro?.kycStatus) whereClause.kycStatus = filtro.kycStatus;

    const [data, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where: whereClause,
        select: {
          usuarioId: true,
          nome: true,
          email: true,
          tipo: true,
          kycStatus: true,
          bloqueado: true,
          criadoEm: true,
        },
        skip,
        take: limit,
        orderBy: { criadoEm: "desc" },
      }),
      this.prisma.usuario.count({ where: whereClause }),
    ]);

    return { data: data as UserListDto[], total, page, limit };
  }

  async blockUser(dto: BlockUserDto): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId: dto.usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário ${dto.usuarioId} não encontrado`);
    }

    if (usuario.bloqueado) {
      throw new BadRequestException(`Usuário já está bloqueado`);
    }

    await this.prisma.usuario.update({
      where: { usuarioId: dto.usuarioId },
      data: {
        bloqueado: true,
        motivoBloqueio: dto.motivo,
        bloqueadoEm: new Date(),
      },
    });

    await this.auditService.registrar({
      usuarioId: dto.usuarioId,
      adminId: dto.adminId,
      acao: "BLOQUEAR_USUARIO",
      descricao: `Usuário bloqueado: ${dto.motivo || "sem motivo especificado"}`,
      mudancasAntes: { bloqueado: usuario.bloqueado },
      mudancasDepois: { bloqueado: true, motivoBloqueio: dto.motivo },
    });
  }

  async unblockUser(dto: UnblockUserDto): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId: dto.usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário ${dto.usuarioId} não encontrado`);
    }

    if (!usuario.bloqueado) {
      throw new BadRequestException(`Usuário não está bloqueado`);
    }

    const motivoPrevio = usuario.motivoBloqueio;
    await this.prisma.usuario.update({
      where: { usuarioId: dto.usuarioId },
      data: {
        bloqueado: false,
        motivoBloqueio: null,
        bloqueadoEm: null,
      },
    });

    await this.auditService.registrar({
      usuarioId: dto.usuarioId,
      adminId: dto.adminId,
      acao: "DESBLOQUEAR_USUARIO",
      descricao: `Usuário desbloqueado (motivo anterior: ${motivoPrevio || "n/a"})`,
      mudancasAntes: { bloqueado: usuario.bloqueado },
      mudancasDepois: { bloqueado: false },
    });
  }

  // ── KYC Management ──────────────────────────────────────

  async listPendingKyc(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: KycPendingDto[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.kycDocumento.findMany({
        where: { status: "PENDENTE" },
        include: {
          usuario: {
            select: {
              usuarioId: true,
              nome: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { criadoEm: "asc" },
      }),
      this.prisma.kycDocumento.count({ where: { status: "PENDENTE" } }),
    ]);

    const formatted = data.map((doc) => ({
      kycDocumentoId: doc.kycDocumentoId,
      usuarioId: doc.usuarioId,
      usuarioNome: doc.usuario.nome,
      usuarioEmail: doc.usuario.email,
      tipo: doc.tipo,
      url: doc.url,
      status: doc.status,
      criadoEm: doc.criadoEm,
      motivo_rejeicao: doc.motivo_rejeicao || undefined,
    }));

    return { data: formatted as KycPendingDto[], total, page, limit };
  }

  async bulkApproveKyc(dto: BulkKycApprovalDto): Promise<{ approved: number }> {
    if (!dto.documentIds || dto.documentIds.length === 0) {
      throw new BadRequestException("Nenhum documento fornecido");
    }

    const docs = await this.prisma.kycDocumento.findMany({
      where: {
        kycDocumentoId: { in: dto.documentIds },
        status: "PENDENTE",
      },
    });

    if (docs.length === 0) {
      throw new BadRequestException("Nenhum documento pendente encontrado");
    }

    const updated = await this.prisma.kycDocumento.updateMany({
      where: {
        kycDocumentoId: { in: docs.map((d) => d.kycDocumentoId) },
      },
      data: {
        status: "APROVADO",
        analisadoPor: dto.adminId,
        analisadoEm: new Date(),
      },
    });

    // Register audit logs for each approval
    for (const doc of docs) {
      await this.auditService.registrar({
        usuarioId: doc.usuarioId,
        adminId: dto.adminId,
        acao: "APROVAR_KYC",
        descricao: `KYC documento ${doc.tipo} aprovado`,
        mudancasAntes: { status: "PENDENTE" },
        mudancasDepois: { status: "APROVADO" },
      });
    }

    // Check if all KYCs are approved for the users
    const userIds = [...new Set(docs.map((d) => d.usuarioId))];
    for (const userId of userIds) {
      const pendingDocs = await this.prisma.kycDocumento.count({
        where: { usuarioId: userId, status: "PENDENTE" },
      });

      if (pendingDocs === 0) {
        await this.prisma.usuario.update({
          where: { usuarioId: userId },
          data: { kycStatus: "APROVADO" },
        });
      }
    }

    return { approved: updated.count };
  }

  async bulkRejectKyc(dto: BulkKycRejectionDto): Promise<{ rejected: number }> {
    if (!dto.documentIds || dto.documentIds.length === 0) {
      throw new BadRequestException("Nenhum documento fornecido");
    }

    const docs = await this.prisma.kycDocumento.findMany({
      where: {
        kycDocumentoId: { in: dto.documentIds },
        status: "PENDENTE",
      },
    });

    if (docs.length === 0) {
      throw new BadRequestException("Nenhum documento pendente encontrado");
    }

    const updated = await this.prisma.kycDocumento.updateMany({
      where: {
        kycDocumentoId: { in: docs.map((d) => d.kycDocumentoId) },
      },
      data: {
        status: "REJEITADO",
        motivo_rejeicao: dto.motivo,
        analisadoPor: dto.adminId,
        analisadoEm: new Date(),
      },
    });

    // Register audit logs
    for (const doc of docs) {
      await this.auditService.registrar({
        usuarioId: doc.usuarioId,
        adminId: dto.adminId,
        acao: "REJEITAR_KYC",
        descricao: `KYC documento ${doc.tipo} rejeitado: ${dto.motivo}`,
        mudancasAntes: { status: "PENDENTE" },
        mudancasDepois: { status: "REJEITADO" },
      });
    }

    return { rejected: updated.count };
  }

  // ── Credit Management ────────────────────────────────────

  async approveCredit(dto: CreditApprovalDto): Promise<void> {
    const credito = await this.prisma.credito.findUnique({
      where: { creditoId: dto.creditoId },
    });

    if (!credito) {
      throw new NotFoundException(`Crédito ${dto.creditoId} não encontrado`);
    }

    if (credito.status !== "ATIVO") {
      throw new BadRequestException(`Crédito já foi processado`);
    }

    await this.prisma.credito.update({
      where: { creditoId: dto.creditoId },
      data: {
        valorAprovado: dto.valorAprovado,
        prazoMeses: dto.prazoMeses,
        taxaMensal: dto.taxaMensal || 0.0099,
      },
    });

    await this.auditService.registrar({
      usuarioId: credito.usuarioId,
      adminId: dto.adminId,
      acao: "APROVAR_CREDITO",
      descricao: `Crédito aprovado: R$ ${dto.valorAprovado} por ${dto.prazoMeses} meses`,
      mudancasAntes: { valorAprovado: credito.valorAprovado, prazoMeses: credito.prazoMeses },
      mudancasDepois: { valorAprovado: dto.valorAprovado, prazoMeses: dto.prazoMeses },
    });
  }

  async rejectCredit(dto: CreditRejectionDto): Promise<void> {
    const credito = await this.prisma.credito.findUnique({
      where: { creditoId: dto.creditoId },
    });

    if (!credito) {
      throw new NotFoundException(`Crédito ${dto.creditoId} não encontrado`);
    }

    await this.prisma.credito.update({
      where: { creditoId: dto.creditoId },
      data: {
        status: "SUSPENSO",
      },
    });

    await this.auditService.registrar({
      usuarioId: credito.usuarioId,
      adminId: dto.adminId,
      acao: "REJEITAR_CREDITO",
      descricao: `Crédito rejeitado: ${dto.motivo}`,
      mudancasAntes: { status: credito.status },
      mudancasDepois: { status: "SUSPENSO" },
    });
  }

  // ── Stage Management ────────────────────────────────────

  async bulkApproveStages(dto: StageApprovalDto): Promise<{ approved: number }> {
    if (!dto.etapaIds || dto.etapaIds.length === 0) {
      throw new BadRequestException("Nenhuma etapa fornecida");
    }

    const etapas = await this.prisma.etapaObra.findMany({
      where: {
        etapaId: { in: dto.etapaIds },
        status: "AGUARDANDO_VISTORIA",
      },
    });

    if (etapas.length === 0) {
      throw new BadRequestException("Nenhuma etapa aguardando vistoria encontrada");
    }

    const updated = await this.prisma.etapaObra.updateMany({
      where: {
        etapaId: { in: etapas.map((e) => e.etapaId) },
      },
      data: {
        status: "CONCLUIDA",
        dataConclusaoReal: new Date(),
      },
    });

    // Register audit logs
    for (const etapa of etapas) {
      const obra = await this.prisma.obra.findUnique({
        where: { obraId: etapa.obraId },
      });

      await this.auditService.registrar({
        usuarioId: obra?.usuarioId || "sistema",
        adminId: dto.adminId,
        acao: "APROVAR_ETAPA",
        descricao: `Etapa ${etapa.nome} aprovada`,
        mudancasAntes: { status: etapa.status },
        mudancasDepois: { status: "CONCLUIDA" },
      });
    }

    return { approved: updated.count };
  }

  // ── Dashboard Stats ──────────────────────────────────────

  async getDashboardStats(): Promise<AdminStatsDto> {
    const [
      totalUsuarios,
      usuariosBloqueados,
      kycPendentes,
      creditosPendentes,
      etapasPendentes,
    ] = await Promise.all([
      this.prisma.usuario.count(),
      this.prisma.usuario.count({ where: { bloqueado: true } }),
      this.prisma.kycDocumento.count({ where: { status: "PENDENTE" } }),
      this.prisma.credito.count({ where: { status: "ATIVO" } }),
      this.prisma.etapaObra.count({ where: { status: "AGUARDANDO_VISTORIA" } }),
    ]);

    return {
      totalUsuarios,
      usuariosBloqueados,
      kycPendentes,
      creditosPendentes,
      etapasPendentes,
      ultimaAtualização: new Date(),
    };
  }

  async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    usuarioId?: string,
    acao?: string,
  ): Promise<{ data: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const whereClause: Prisma.AuditLogWhereInput = {};
    if (usuarioId) whereClause.usuarioId = usuarioId;
    if (acao) whereClause.acao = acao;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
        include: {
          usuario: { select: { nome: true, email: true } },
          admin: { select: { nome: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { criadoEm: "desc" },
      }),
      this.prisma.auditLog.count({ where: whereClause }),
    ]);

    return { data, total };
  }
}
