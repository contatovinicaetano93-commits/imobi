import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";
import { QUEUE_LIBERACAO, type LiberacaoJob } from "../../common/constants";

@Injectable()
export class EtapasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
    private readonly pushNotificacoes: PushNotificacoesService,
    @InjectQueue(QUEUE_LIBERACAO) private readonly liberacaoQueue: Queue<LiberacaoJob>
  ) {}

  async aprovar(gestorId: string, etapaId: string, observacao?: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: {
        obra: {
          include: {
            credito: { select: { creditoId: true, status: true, valorAprovado: true } },
            usuario: { select: { usuarioId: true, nome: true, email: true } },
          },
        },
      },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    // Exige ao menos 1 evidência validada
    const evidencias = await this.prisma.evidenciaEtapa.count({
      where: { etapaId: etapaId, validada: true },
    });
    if (evidencias === 0) {
      throw new BadRequestException("Etapa precisa ter ao menos uma evidência validada.");
    }

    // Atomic check + update: prevents double approval under concurrent requests
    const updated = await this.prisma.etapaObra.updateMany({
      where: { etapaId, status: "AGUARDANDO_VISTORIA" },
      data: { status: "CONCLUIDA", dataConclusaoReal: new Date() },
    });
    if (updated.count === 0) {
      throw new BadRequestException("Etapa não está aguardando vistoria.");
    }

    // Create audit log entry
    await this.prisma.etapaAuditLog.create({
      data: {
        etapaId,
        acaoTipo: "APROVADA",
        usuarioId: gestorId,
        observacoes: observacao || null,
      },
    });

    // Notifica o criador da obra sobre a aprovação
    await this.notificacoes.criar(
      etapa.obra.usuarioId,
      "ETAPA_APROVADA",
      `Etapa aprovada: ${etapa.nome}`,
      `A etapa "${etapa.nome}" da obra "${etapa.obra.nome}" foi aprovada com sucesso. A liberação da parcela foi agendada.`,
      `/dashboard/obras/${etapa.obra.obraId}`
    );

    // Envia push notification
    this.pushNotificacoes.enviarPush({
      usuarioId: etapa.obra.usuarioId,
      titulo: `Etapa Aprovada: ${etapa.nome}`,
      mensagem: `Sua etapa foi aprovada e a parcela será liberada em breve.`,
      tipo: "ETAPA_APROVADA",
      dados: { obraId: etapa.obra.obraId, etapaId },
    }).catch(() => {});

    // Envia email de confirmação
    const credito = etapa.obra.credito;
    if (credito) {
      const valorLiberacao = Number(credito.valorAprovado) * (Number(etapa.percentualObra) / 100);
      this.email.etapaAprovadaEmail(
        etapa.obra.usuario?.nome || "usuário",
        etapa.obra.usuario?.email || "",
        etapa.nome,
        etapa.obra.nome,
        valorLiberacao
      ).catch(() => {});
    }

    // Dispara liberação de parcela via fila — criação da liberação é atômica com enfileiramento
    if (credito && credito.status === "ATIVO") {
      const valorLiberacao = Number(credito.valorAprovado) * (Number(etapa.percentualObra) / 100);
      const liberacao = await this.prisma.liberacaoParcela.create({
        data: { creditoId: credito.creditoId, valor: valorLiberacao, status: "PENDENTE" },
      });
      try {
        await this.liberacaoQueue.add({ creditoId: credito.creditoId, etapaId, liberacaoId: liberacao.liberacaoId, valor: valorLiberacao });
      } catch (err) {
        // Se o enfileiramento falhar, marca a liberação como FALHA para evitar parcela presa em PENDENTE
        await this.prisma.liberacaoParcela.update({
          where: { liberacaoId: liberacao.liberacaoId },
          data: { status: "FALHA", processadoEm: new Date() },
        });
        throw err;
      }
    }

    return { ok: true, observacao };
  }

  async rejeitar(gestorId: string, etapaId: string, motivo: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: {
        obra: {
          include: {
            usuario: { select: { usuarioId: true, nome: true, email: true } },
          },
        },
      },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    const updated = await this.prisma.etapaObra.updateMany({
      where: { etapaId, status: "AGUARDANDO_VISTORIA" },
      data: { status: "REPROVADA" },
    });
    if (updated.count === 0) {
      throw new BadRequestException("Etapa não está aguardando vistoria.");
    }

    // Create audit log entry
    await this.prisma.etapaAuditLog.create({
      data: {
        etapaId,
        acaoTipo: "REJEITADA",
        usuarioId: gestorId,
        observacoes: motivo,
      },
    });

    await this.notificacoes.criar(
      etapa.obra.usuarioId,
      "ETAPA_REPROVADA",
      `Etapa reprovada: ${etapa.nome}`,
      `A etapa "${etapa.nome}" foi reprovada. Motivo: ${motivo}`,
      `/dashboard/obras/${etapa.obra.obraId}`
    );

    return { ok: true, motivo };
  }

  // Valid state transitions. ADMIN can force transitions but only along allowed edges
  // to prevent illegal combinations (e.g. CONCLUIDA → PLANEJADA) that would corrupt the
  // credit-release flow.
  private static readonly ALLOWED_TRANSITIONS: Record<string, string[]> = {
    PLANEJADA: [],
    EM_EXECUCAO: ["PLANEJADA"],
    AGUARDANDO_VISTORIA: ["EM_EXECUCAO"],
    CONCLUIDA: ["AGUARDANDO_VISTORIA"],
    REPROVADA: ["AGUARDANDO_VISTORIA"],
  };

  async atualizarStatus(etapaId: string, status: string) {
    const allowedFrom = EtapasService.ALLOWED_TRANSITIONS[status];
    if (!allowedFrom) throw new BadRequestException(`Status de destino inválido: ${status}.`);

    // Allow admin to reset back to PLANEJADA only from non-terminal states
    // PLANEJADA has no allowed predecessors in the map above because it is the initial
    // state. To allow admin reset use a special-case: any non-CONCLUIDA state can be
    // reset to PLANEJADA.
    if (status === "PLANEJADA") {
      const updated = await this.prisma.etapaObra.updateMany({
        where: { etapaId, status: { notIn: ["CONCLUIDA"] as never[] } },
        data: { status: "PLANEJADA" as never },
      });
      if (updated.count === 0)
        throw new BadRequestException("Etapa não encontrada ou já está concluída — não é possível regredir ao status PLANEJADA.");
      return { ok: true };
    }

    const updated = await this.prisma.etapaObra.updateMany({
      where: { etapaId, status: { in: allowedFrom as never[] } },
      data: { status: status as never },
    });
    if (updated.count === 0)
      throw new BadRequestException(
        `Transição inválida para ${status}. Estado atual não é um dos permitidos: ${allowedFrom.join(", ")}.`
      );
    return { ok: true };
  }

  async listarPorObra(obraId: string, usuarioId: string, isManager: boolean) {
    // IDOR guard: unless the caller is a manager/admin, the obra must belong to them.
    if (!isManager) {
      const obra = await this.prisma.obra.findUnique({
        where: { obraId },
        select: { usuarioId: true },
      });
      if (!obra) throw new NotFoundException("Obra não encontrada.");
      if (obra.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado.");
    }

    return this.prisma.etapaObra.findMany({
      where: { obraId },
      orderBy: { ordem: "asc" },
      include: {
        evidencias: {
          select: { evidenciaId: true, fotoUrl: true, validada: true, criadoEm: true },
          orderBy: { criadoEm: "desc" },
          take: 5,
        },
      },
    });
  }
}
