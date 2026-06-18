import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import type { EtapaStatus } from "@prisma/client";
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
      include: { obra: { include: { credito: true, usuario: true } } },
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

    // Dispara liberação de parcela via fila (assíncrono)
    if (credito && credito.status === "ATIVO") {
      const valorLiberacao = Number(credito.valorAprovado) * (Number(etapa.percentualObra) / 100);
      const liberacao = await this.prisma.liberacaoParcela.create({
        data: { creditoId: credito.creditoId, valor: valorLiberacao, status: "PENDENTE" },
      });
      await this.liberacaoQueue.add({ creditoId: credito.creditoId, etapaId, liberacaoId: liberacao.liberacaoId, valor: valorLiberacao });
    }

    return { ok: true, observacao };
  }

  async rejeitar(gestorId: string, etapaId: string, motivo: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { include: { usuario: true } } },
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

  async atualizarStatus(etapaId: string, status: string, usuarioId: string, userTipo: string) {
    const etapaExistente = await this.prisma.etapaObra.findUnique({
      where: { etapaId }, include: { obra: true },
    });
    if (!etapaExistente) throw new NotFoundException("Etapa não encontrada.");

    const isPrivileged = ["GESTOR", "ADMIN"].includes(userTipo);
    if (!isPrivileged) {
      if (etapaExistente.obra.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado.");
      if (status !== "AGUARDANDO_VISTORIA") throw new ForbiddenException("Você só pode submeter a etapa para vistoria.");
    }

    return this.prisma.etapaObra.update({
      where: { etapaId },
      data: { status: status as EtapaStatus },
    });
  }

  async listarPorObra(obraId: string, usuario: { id: string; tipo: string }) {
    const obra = await this.prisma.obra.findUnique({ where: { obraId }, select: { usuarioId: true } });
    if (!obra) throw new NotFoundException("Obra não encontrada.");

    const privileged = ["ADMIN", "GESTOR", "ENGENHEIRO"].includes(usuario.tipo);
    if (!privileged && obra.usuarioId !== usuario.id) {
      throw new ForbiddenException("Acesso negado.");
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
