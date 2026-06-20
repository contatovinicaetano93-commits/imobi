import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailQueueService } from "../email/email-queue.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";
import { QUEUE_LIBERACAO, type LiberacaoJob } from "../../common/constants";
import type { EtapaStatus } from "@prisma/client";

const STATUSES_VISTORIAVEL: EtapaStatus[] = ["PLANEJADA", "EM_EXECUCAO", "AGUARDANDO_VISTORIA"];

@Injectable()
export class VistoriaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailQueueService,
    private readonly pushNotificacoes: PushNotificacoesService,
    @InjectQueue(QUEUE_LIBERACAO) private readonly liberacaoQueue: Queue<LiberacaoJob>,
  ) {}

  async aprovar(gestorId: string, etapaId: string, observacoes?: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { include: { credito: true, usuario: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    const updated = await this.prisma.etapaObra.updateMany({
      where: { etapaId, status: { in: STATUSES_VISTORIAVEL } },
      data: { status: "CONCLUIDA" as EtapaStatus, dataConclusaoReal: new Date() },
    });
    if (updated.count === 0) {
      throw new BadRequestException("Etapa não pode ser aprovada no status atual.");
    }

    await this.prisma.etapaAuditLog.create({
      data: { etapaId, acaoTipo: "APROVADA", usuarioId: gestorId, observacoes: observacoes ?? null },
    });

    await this.notificacoes.criar(
      etapa.obra.usuarioId,
      "ETAPA_APROVADA",
      `Etapa aprovada: ${etapa.nome}`,
      `A etapa "${etapa.nome}" da obra "${etapa.obra.nome}" foi aprovada. A liberação da parcela foi agendada.`,
      `/dashboard/obras/${etapa.obra.obraId}`,
    );

    this.pushNotificacoes
      .enviarPush({
        usuarioId: etapa.obra.usuarioId,
        titulo: `Etapa Aprovada: ${etapa.nome}`,
        mensagem: "Sua etapa foi aprovada e a parcela será liberada em breve.",
        tipo: "ETAPA_APROVADA",
        dados: { obraId: etapa.obra.obraId, etapaId },
      })
      .catch(() => {});

    const credito = etapa.obra.credito;
    if (credito) {
      const valorLiberacao = Number(credito.valorAprovado ?? 0) * (Number(etapa.percentualObra) / 100);

      this.email
        .etapaAprovada(
          etapa.obra.usuario?.nome ?? "usuário",
          etapa.obra.usuario?.email ?? "",
          etapa.nome,
          etapa.obra.nome,
          valorLiberacao,
        )
        .catch(() => {});

      if (credito.status === "ATIVO" && valorLiberacao > 0) {
        const liberacao = await this.prisma.liberacaoParcela.create({
          data: { creditoId: credito.creditoId, valor: valorLiberacao, status: "PENDENTE" },
        });
        await this.liberacaoQueue.add({
          creditoId: credito.creditoId,
          etapaId,
          liberacaoId: liberacao.liberacaoId,
          valor: valorLiberacao,
        });
      }
    }

    return { ok: true, etapaId, status: "CONCLUIDA" };
  }

  async listarPendentes(limit: number, offset: number) {
    const [data, total] = await Promise.all([
      this.prisma.etapaObra.findMany({
        where: { status: "AGUARDANDO_VISTORIA" },
        take: limit,
        skip: offset,
        orderBy: { atualizadoEm: "asc" },
        include: {
          obra: { select: { obraId: true, nome: true, usuario: { select: { nome: true, email: true } } } },
        },
      }),
      this.prisma.etapaObra.count({ where: { status: "AGUARDANDO_VISTORIA" } }),
    ]);
    return { data, total, page: Math.floor(offset / limit) + 1, limit };
  }

  async agendar(gestorId: string, etapaId: string, dataAgendada: string, observacoes?: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { select: { usuarioId: true, nome: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    const dataAgendadaDate = new Date(dataAgendada);
    if (isNaN(dataAgendadaDate.getTime())) throw new BadRequestException("Data de agendamento inválida.");

    await this.prisma.etapaAuditLog.create({
      data: { etapaId, acaoTipo: "VISTORIA_AGENDADA", usuarioId: gestorId, observacoes: observacoes ?? null },
    });

    await this.notificacoes.criar(
      etapa.obra.usuarioId,
      "VISTORIA_PENDENTE",
      `Vistoria agendada: ${etapa.nome}`,
      `Vistoria para "${etapa.nome}" agendada para ${dataAgendadaDate.toLocaleDateString("pt-BR")}.`,
      null,
    );

    return { ok: true, etapaId, dataAgendada: dataAgendadaDate.toISOString() };
  }

  async rejeitar(gestorId: string, etapaId: string, motivo: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { include: { usuario: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    const updated = await this.prisma.etapaObra.updateMany({
      where: { etapaId, status: { in: STATUSES_VISTORIAVEL } },
      data: { status: "REPROVADA" as EtapaStatus },
    });
    if (updated.count === 0) {
      throw new BadRequestException("Etapa não pode ser rejeitada no status atual.");
    }

    await this.prisma.etapaAuditLog.create({
      data: { etapaId, acaoTipo: "REJEITADA", usuarioId: gestorId, observacoes: motivo },
    });

    await this.notificacoes.criar(
      etapa.obra.usuarioId,
      "ETAPA_REPROVADA",
      `Etapa reprovada: ${etapa.nome}`,
      `A etapa "${etapa.nome}" foi reprovada. Motivo: ${motivo}`,
      `/dashboard/obras/${etapa.obra.obraId}`,
    );

    return { ok: true, etapaId, status: "REPROVADA" };
  }
}
