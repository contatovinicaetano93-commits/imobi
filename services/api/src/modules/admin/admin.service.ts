import { Injectable, ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcryptjs";
import { UsuarioTipo } from "@prisma/client";
import type { AtualizarUsuarioAdminInput } from "@imbobi/schemas";

export interface CriarUsuarioAdminDto {
  nome: string;
  email: string;
  senha: string;
  tipo: UsuarioTipo;
}

export interface AdminOverview {
  totalUsuarios: number;
  obrasAtivas: number;
  obrasTotal: number;
  creditoAprovado: number;
  creditoLiberado: number;
  kycPendentes: number;
  etapasPendentes: number;
  visitasAgendadas: number;
  filaLiberacao: number;
}

export interface Atividade {
  id: string;
  tipo: string;
  descricao: string;
  criadoEm: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<AdminOverview> {
    const [
      totalUsuarios,
      obrasAtivas,
      obrasTotal,
      creditosAgregados,
      kycPendentes,
      etapasPendentes,
      filaLiberacao,
      visitasAgendadas,
    ] = await Promise.all([
      this.prisma.usuario.count({ where: { deletadoEm: null } }),
      this.prisma.obra.count({ where: { status: "EM_EXECUCAO" } }),
      this.prisma.obra.count(),
      this.prisma.credito.aggregate({
        where: { status: { in: ["ATIVO"] } },
        _sum: { valorAprovado: true, valorLiberado: true },
      }),
      this.prisma.kycDocumento.count({ where: { status: { in: ["PENDENTE"] } } }),
      // etapas aguardando aprovação de vistoria
      this.prisma.etapaObra.count({ where: { status: "AGUARDANDO_VISTORIA" } }),
      // etapas concluídas aguardando liberação financeira
      this.prisma.etapaObra.count({ where: { status: "CONCLUIDA" } }),
      // obras distintas com pelo menos uma etapa aguardando vistoria (site visits pending)
      this.prisma.obra.count({
        where: { etapas: { some: { status: "AGUARDANDO_VISTORIA" } } },
      }),
    ]);

    return {
      totalUsuarios,
      obrasAtivas,
      obrasTotal,
      creditoAprovado: Number(creditosAgregados._sum.valorAprovado ?? 0),
      creditoLiberado: Number(creditosAgregados._sum.valorLiberado ?? 0),
      kycPendentes,
      etapasPendentes,
      visitasAgendadas,
      filaLiberacao,
    };
  }

  async atividades(limit: number): Promise<Atividade[]> {
    const [etapasAudit, kycDocs, creditos] = await Promise.all([
      this.prisma.etapaAuditLog.findMany({
        orderBy: { criadoEm: "desc" },
        take: limit,
        include: {
          etapa: { select: { nome: true } },
        },
      }),
      this.prisma.kycDocumento.findMany({
        orderBy: { criadoEm: "desc" },
        take: limit,
        include: {
          usuario: { select: { nome: true } },
        },
      }),
      this.prisma.credito.findMany({
        orderBy: { criadoEm: "desc" },
        take: limit,
        include: {
          usuario: { select: { nome: true } },
        },
      }),
    ]);

    const eventos: Atividade[] = [
      ...etapasAudit.map((log) => ({
        id: log.auditId,
        tipo: `ETAPA_${log.acaoTipo}`,
        descricao: `Etapa "${log.etapa.nome}" ${log.acaoTipo.toLowerCase()}`,
        criadoEm: log.criadoEm.toISOString(),
      })),
      ...kycDocs.map((doc) => ({
        id: doc.kycDocumentoId,
        tipo: "KYC_ENVIADO",
        descricao: `KYC "${doc.tipo}" enviado por ${doc.usuario.nome}`,
        criadoEm: doc.criadoEm.toISOString(),
      })),
      ...creditos.map((c) => ({
        id: c.creditoId,
        tipo: "CREDITO_SOLICITADO",
        descricao: `Crédito R$ ${c.valorAprovado.toFixed(2)} solicitado por ${c.usuario.nome}`,
        criadoEm: c.criadoEm.toISOString(),
      })),
    ];

    eventos.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );

    return eventos.slice(0, limit);
  }

  async listarUsuarios() {
    const rows = await this.prisma.usuario.findMany({
      where: { deletadoEm: null },
      orderBy: { criadoEm: "desc" },
      select: {
        usuarioId: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        kycStatus: true,
        bloqueadoEm: true,
        funcoesBloqueadas: true,
        criadoEm: true,
        _count: { select: { obras: true, creditos: true } },
      },
    });
    return rows.map(({ usuarioId, _count, ...rest }) => ({
      id: usuarioId,
      ...rest,
      totalObras: _count.obras,
      totalCreditos: _count.creditos,
    }));
  }

  async atualizarUsuario(id: string, dto: AtualizarUsuarioAdminInput, adminId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { usuarioId: id } });
    if (!usuario || usuario.deletadoEm) throw new NotFoundException("Usuário não encontrado");

    if (id === adminId && (dto.bloqueado === true || (dto.tipo && dto.tipo !== "ADMIN"))) {
      throw new BadRequestException("Não é possível bloquear ou rebaixar a própria conta de administrador.");
    }

    if (dto.email && dto.email !== usuario.email) {
      const emailEmUso = await this.prisma.usuario.findFirst({
        where: { email: dto.email, usuarioId: { not: id }, deletadoEm: null },
      });
      if (emailEmUso) throw new ConflictException("E-mail já cadastrado.");
    }

    const data: Record<string, unknown> = {};
    if (dto.nome !== undefined) data.nome = dto.nome;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.telefone !== undefined) data.telefone = dto.telefone;
    if (dto.kycStatus !== undefined) data.kycStatus = dto.kycStatus;
    if (dto.tipo !== undefined) data.tipo = dto.tipo as UsuarioTipo;
    if (dto.bloqueado !== undefined) data.bloqueadoEm = dto.bloqueado ? new Date() : null;
    if (dto.funcoesBloqueadas !== undefined) data.funcoesBloqueadas = dto.funcoesBloqueadas;
    if (dto.novaSenha) data.passwordHash = await bcrypt.hash(dto.novaSenha, 12);

    const { usuarioId, ...atualizado } = await this.prisma.usuario.update({
      where: { usuarioId: id },
      data,
      select: {
        usuarioId: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        kycStatus: true,
        bloqueadoEm: true,
        funcoesBloqueadas: true,
        criadoEm: true,
      },
    });

    // Revoke active sessions when account is blocked or role changes
    const shouldRevokeSessions =
      dto.bloqueado === true ||
      (dto.tipo !== undefined && dto.tipo !== usuario.tipo);
    if (shouldRevokeSessions) {
      await this.prisma.sessaoToken.updateMany({
        where: { usuarioId: id, revogadoEm: null },
        data: { revogadoEm: new Date() },
      });
    }

    // Audit log for sensitive field changes
    const auditActions: { acaoTipo: string; detalhes: string }[] = [];
    if (dto.tipo !== undefined && dto.tipo !== usuario.tipo) {
      auditActions.push({ acaoTipo: "USUARIO_TIPO_ALTERADO", detalhes: `${usuario.tipo} → ${dto.tipo}` });
    }
    if (dto.bloqueado === true) {
      auditActions.push({ acaoTipo: "USUARIO_BLOQUEADO", detalhes: `Sessões revogadas` });
    } else if (dto.bloqueado === false && usuario.bloqueadoEm) {
      auditActions.push({ acaoTipo: "USUARIO_DESBLOQUEADO", detalhes: null });
    }

    if (auditActions.length > 0) {
      await this.prisma.adminAuditLog.createMany({
        data: auditActions.map((a) => ({
          adminId,
          alvoId: id,
          acaoTipo: a.acaoTipo,
          detalhes: a.detalhes,
        })),
      });
    }

    return { id: usuarioId, ...atualizado };
  }

  async listarObras(limit: number, offset: number) {
    const obras = await this.prisma.obra.findMany({
      take: limit, skip: offset,
      orderBy: { criadoEm: "desc" },
      include: {
        usuario: { select: { nome: true } },
        etapas: { select: { status: true } },
      },
    });
    // Map to the ApiObra shape expected by the frontend (id, nome, status, tomador)
    return obras.map((o) => ({
      id: o.obraId,
      nome: o.nome,
      status: o.status,
      tomador: o.usuario?.nome,
    }));
  }

  async criarUsuario(dto: CriarUsuarioAdminDto, adminId: string) {
    const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existe && !existe.deletadoEm) throw new ConflictException("E-mail já cadastrado");
    const passwordHash = await bcrypt.hash(dto.senha, 12);
    const cpfDigits = Buffer.from(dto.email.toLowerCase())
      .toString("hex")
      .replace(/[^0-9]/g, "")
      .padStart(11, "0")
      .slice(0, 11);
    const { usuarioId, ...rest } = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        cpf: cpfDigits,
        telefone: "11999999999",
        passwordHash,
        tipo: dto.tipo,
        consentidoTermos: true,
        consentidoPrivacy: true,
        consentidoKyc: true,
        consentidoEm: new Date(),
      },
      select: {
        usuarioId: true,
        nome: true,
        email: true,
        tipo: true,
        kycStatus: true,
        criadoEm: true,
      },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        alvoId: usuarioId,
        acaoTipo: "USUARIO_CRIADO",
        detalhes: `tipo=${dto.tipo} email=${dto.email}`,
      },
    });

    return { id: usuarioId, ...rest };
  }

  async excluirUsuario(id: string, adminId: string) {
    if (id === adminId) throw new BadRequestException("Não é possível excluir a própria conta.");
    const usuario = await this.prisma.usuario.findUnique({ where: { usuarioId: id } });
    if (!usuario || usuario.deletadoEm) throw new NotFoundException("Usuário não encontrado.");

    await this.prisma.$transaction([
      this.prisma.sessaoToken.updateMany({
        where: { usuarioId: id, revogadoEm: null },
        data: { revogadoEm: new Date() },
      }),
      this.prisma.usuario.update({
        where: { usuarioId: id },
        data: { deletadoEm: new Date() },
      }),
    ]);

    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        alvoId: null,
        acaoTipo: "USUARIO_EXCLUIDO",
        detalhes: `email=${usuario.email} tipo=${usuario.tipo}`,
      },
    });

    return { ok: true };
  }

  async listarAuditLogs(limit: number, offset: number, alvoId?: string, acaoTipo?: string) {
    const where: Record<string, unknown> = {};
    if (alvoId) where.alvoId = alvoId;
    if (acaoTipo) where.acaoTipo = acaoTipo;

    const [logs, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { criadoEm: "desc" },
        include: {
          admin: { select: { nome: true, email: true } },
          alvo: { select: { nome: true, email: true } },
        },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);
    return { logs, total, page: Math.floor(offset / limit) + 1, pageSize: limit };
  }
}
