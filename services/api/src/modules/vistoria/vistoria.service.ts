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

const STATUSES_VISTORIAVEL = ["PLANEJADA", "EM_EXECUCAO", "AGUARDANDO_VISTORIA", "APROVADA_ENGENHEIRO"];

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

    const updated = await this.prisma.etapaObra.updateMany({
      where: { etapaId, status: { in: ["PLANEJADA", "EM_EXECUCAO", "AGUARDANDO_VISTORIA"] } },
      data: { status: "APROVADA_ENGENHEIRO" },
    });
    if (updated.count === 0) {
      throw new BadRequestException("Etapa não pode ser aprovada no status atual.");
    }

    await this.prisma.etapaAuditLog.create({
      data: { etapaId, acaoTipo: "APROVADA_ENGENHEIRO", usuarioId: gestorId, observacoes: observacoes ?? null },
    });

    // Notify all admins/gestores
    const admins = await this.prisma.usuario.findMany({
      where: { tipo: { in: ["ADMIN", "GESTOR"] as any }, deletadoEm: null },
      select: { usuarioId: true },
    });
    await Promise.all(
      admins.map((a) =>
        this.notificacoes.criar(
          a.usuarioId,
          "ETAPA_AGUARDANDO_ADMIN" as any,
          `Vistoria aprovada: ${etapa.nome}`,
          `O engenheiro aprovou a etapa "${etapa.nome}" da obra "${etapa.obra.nome}". Aguardando sua validação para liberar a parcela.`,
          `/admin/obras/${etapa.obra.obraId}`,
        )
      )
    );

    return { ok: true, etapaId, status: "APROVADA_ENGENHEIRO" };
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
