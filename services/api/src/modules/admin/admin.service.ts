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
    ] = await Promise.all([
      this.prisma.usuario.count({
        where: { deletadoEm: null },
      }),
      this.prisma.obra.count({
        where: { status: "EM_EXECUCAO" },
      }),
      this.prisma.obra.count(),
      this.prisma.credito.aggregate({
        where: { status: { in: ["ATIVO"] } },
        _sum: {
          valorAprovado: true,
          valorLiberado: true,
        },
      }),
      this.prisma.kycDocumento.count({
        where: { status: { in: ["PENDENTE"] } },
      }),
      this.prisma.etapaObra.count({
        where: { status: "AGUARDANDO_VISTORIA" },
      }),
      this.prisma.etapaObra.count({
        where: { status: "CONCLUIDA" },
      }),
    ]);

    return {
      totalUsuarios,
      obrasAtivas,
      obrasTotal,
      creditoAprovado: creditosAgregados._sum.valorAprovado ?? 0,
      creditoLiberado: creditosAgregados._sum.valorLiberado ?? 0,
      kycPendentes,
      etapasPendentes,
      visitasAgendadas: etapasPendentes,
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

    // O admin não pode bloquear a própria conta nem rebaixar o próprio perfil
    if (id === adminId && (dto.bloqueado === true || (dto.tipo && dto.tipo !== "ADMIN"))) {
      throw new BadRequestException("Não é possível bloquear ou rebaixar a própria conta de administrador.");
    }

    const { usuarioId, ...atualizado } = await this.prisma.usuario.update({
      where: { usuarioId: id },
      data: {
        ...(dto.tipo !== undefined && { tipo: dto.tipo as UsuarioTipo }),
        ...(dto.bloqueado !== undefined && { bloqueadoEm: dto.bloqueado ? new Date() : null }),
        ...(dto.funcoesBloqueadas !== undefined && { funcoesBloqueadas: dto.funcoesBloqueadas }),
      },
      select: {
        usuarioId: true,
        nome: true,
        email: true,
        tipo: true,
        kycStatus: true,
        bloqueadoEm: true,
        funcoesBloqueadas: true,
        criadoEm: true,
      },
    });

    // Bloqueio de conta derruba as sessões ativas do usuário
    if (dto.bloqueado === true) {
      await this.prisma.sessaoToken.updateMany({
        where: { usuarioId: id, revogadoEm: null },
        data: { revogadoEm: new Date() },
      });
    }

    return { id: usuarioId, ...atualizado };
  }

  async criarUsuario(dto: CriarUsuarioAdminDto) {
    const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existe) throw new ConflictException("E-mail já cadastrado");
    const passwordHash = await bcrypt.hash(dto.senha, 10);
    const { usuarioId, ...rest } = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        cpf: `000.000.000-${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`,
        telefone: "",
        passwordHash,
        tipo: dto.tipo,
        consentidoTermos: true,
        consentidoPrivacy: true,
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
    return { id: usuarioId, ...rest };
  }
}
