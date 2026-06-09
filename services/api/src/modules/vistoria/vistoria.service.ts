import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";
import { QUEUE_LIBERACAO, type LiberacaoJob } from "../../common/constants";

const STATUSES_VISTORIAVEL = ["PLANEJADA", "EM_EXECUCAO", "AGUARDANDO_VISTORIA"];

@Injectable()
export class VistoriaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
    private readonly pushNotificacoes: PushNotificacoesService,
    @InjectQueue(QUEUE_LIBERACAO) private readonly liberacaoQueue: Queue<LiberacaoJob>,
  ) {}

  async aprovar(gestorId: string, etapaId: string, observacoes?: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { include: { credito: true, usuario: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    const evidencias = await this.prisma.evidenciaEtapa.count({
      where: { etapaId, validada: true },
    });
    if (evidencias === 0) {
      throw new BadRequestException("Etapa precisa ter ao menos uma evidência validada.");
    }

    const updated = await this.prisma.etapaObra.updateMany({
      where: { etapaId, status: "AGUARDANDO_VISTORIA" },
      data: { status: "CONCLUIDA", dataConclusaoReal: new Date() },
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
        .etapaAprovadaEmail(
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
        try {
          await this.liberacaoQueue.add({
            creditoId: credito.creditoId,
            etapaId,
            liberacaoId: liberacao.liberacaoId,
            valor: valorLiberacao,
          });
        } catch (err) {
          await this.prisma.liberacaoParcela.update({
            where: { liberacaoId: liberacao.liberacaoId },
            data: { status: "FALHA", processadoEm: new Date() },
          });
          throw err;
        }
      }
    }

    return { ok: true, etapaId, status: "CONCLUIDA" };
  }

  async rejeitar(gestorId: string, etapaId: string, motivo: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { include: { usuario: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    const updated = await this.prisma.etapaObra.updateMany({
      where: { etapaId, status: { in: STATUSES_VISTORIAVEL as any } },
      data: { status: "REPROVADA" },
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
