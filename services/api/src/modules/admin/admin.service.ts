import { Injectable, ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";
import * as bcrypt from "bcryptjs";
import { UsuarioTipo } from "@prisma/client";
import type { AtualizarUsuarioAdminInput } from "@imbobi/schemas";
import { QUEUE_LIBERACAO, type LiberacaoJob } from "../../common/constants";

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
    private readonly pushNotificacoes: PushNotificacoesService,
    @InjectQueue(QUEUE_LIBERACAO) private readonly liberacaoQueue: Queue<LiberacaoJob>,
  ) {}

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
      // etapas aguardando validação: eng pendente ou aguardando confirmação admin
      this.prisma.etapaObra.count({ where: { status: { in: ["AGUARDANDO_VISTORIA", "APROVADA_ENGENHEIRO"] as any } } }),
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

  async validarEtapa(adminId: string, etapaId: string, aprovado: boolean, motivo?: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { include: { credito: true, usuario: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");
    if (etapa.status !== "APROVADA_ENGENHEIRO") {
      throw new BadRequestException("Etapa não está aguardando validação do admin.");
    }

    if (!aprovado) {
      await this.prisma.etapaObra.update({ where: { etapaId }, data: { status: "REPROVADA" } });
      await this.prisma.etapaAuditLog.create({
        data: { etapaId, acaoTipo: "REJEITADA_ADMIN", usuarioId: adminId, observacoes: motivo ?? null },
      });
      await this.notificacoes.criar(
        etapa.obra.usuarioId,
        "ETAPA_REPROVADA",
        `Etapa reprovada pelo gestor: ${etapa.nome}`,
        `A etapa "${etapa.nome}" foi reprovada pelo gestor. ${motivo ? `Motivo: ${motivo}` : ""}`,
        `/obras/${etapa.obra.obraId}`,
      );
      return { ok: true, etapaId, status: "REPROVADA" };
    }

    await this.prisma.etapaObra.update({
      where: { etapaId },
      data: { status: "CONCLUIDA", dataConclusaoReal: new Date() },
    });
    await this.prisma.etapaAuditLog.create({
      data: { etapaId, acaoTipo: "CONCLUIDA_ADMIN", usuarioId: adminId, observacoes: motivo ?? null },
    });

    await this.notificacoes.criar(
      etapa.obra.usuarioId,
      "ETAPA_APROVADA",
      `Etapa concluída: ${etapa.nome}`,
      `A etapa "${etapa.nome}" foi validada pelo gestor. A liberação da parcela foi agendada.`,
      `/obras/${etapa.obra.obraId}`,
    );

    const credito = etapa.obra.credito;
    if (credito?.status === "ATIVO") {
      const valorLiberacao = Number(credito.valorAprovado ?? 0) * (Number(etapa.percentualObra) / 100);
      if (valorLiberacao > 0) {
        const liberacao = await this.prisma.liberacaoParcela.create({
          data: { creditoId: credito.creditoId, valor: valorLiberacao, status: "PENDENTE" },
        });
        await this.liberacaoQueue.add({
          creditoId: credito.creditoId,
          etapaId,
          liberacaoId: liberacao.liberacaoId,
          valor: valorLiberacao,
        });

        this.email
          .etapaAprovadaEmail(
            etapa.obra.usuario?.nome ?? "usuário",
            etapa.obra.usuario?.email ?? "",
            etapa.nome,
            etapa.obra.nome,
            valorLiberacao,
          )
          .catch(() => {});

        this.pushNotificacoes
          .enviarPush({
            usuarioId: etapa.obra.usuarioId,
            titulo: `Parcela liberada: ${etapa.nome}`,
            mensagem: `R$ ${valorLiberacao.toFixed(2)} será liberado em breve.`,
            tipo: "PARCELA_LIBERADA",
            dados: { obraId: etapa.obra.obraId, etapaId },
          })
          .catch(() => {});
      }
    }

    return { ok: true, etapaId, status: "CONCLUIDA" };
  }

  async listarEtapasParaValidar() {
    const etapas = await this.prisma.etapaObra.findMany({
      where: { status: "APROVADA_ENGENHEIRO" as any },
      orderBy: { atualizadoEm: "asc" },
      include: {
        obra: {
          include: {
            usuario: { select: { nome: true } },
            credito: { select: { valorAprovado: true } },
          },
        },
      },
    });
    return etapas.map((e) => ({
      etapaId: e.etapaId,
      nome: e.nome,
      percentualObra: e.percentualObra,
      obraId: e.obra.obraId,
      obraNome: e.obra.nome,
      construtor: e.obra.usuario?.nome,
      valorParcela: e.obra.credito
        ? Number(e.obra.credito.valorAprovado) * (Number(e.percentualObra) / 100)
        : 0,
      aguardandoDesde: e.atualizadoEm,
    }));
  }

  async criarUsuario(dto: CriarUsuarioAdminDto) {
    const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existe) throw new ConflictException("E-mail já cadastrado");
    const passwordHash = await bcrypt.hash(dto.senha, 10);
    const { usuarioId, ...rest } = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        // Derive a deterministic placeholder CPF from the email (email is unique → CPF is unique)
        cpf: (() => {
          const h = Buffer.from(dto.email.toLowerCase()).toString("hex").replace(/[^0-9]/g, "").padStart(9, "0").slice(0, 9);
          return `${h.slice(0, 3)}.${h.slice(3, 6)}.${h.slice(6, 9)}-00`;
        })(),
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
