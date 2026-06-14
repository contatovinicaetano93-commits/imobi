import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";

const STATUSES_VISTORIAVEL = ["PLANEJADA", "EM_EXECUCAO", "AGUARDANDO_VISTORIA"];

@Injectable()
export class VistoriaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly pushNotificacoes: PushNotificacoesService,
  ) {}

  async aprovar(engenheiroId: string, etapaId: string, observacoes?: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { include: { usuario: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    const updated = await this.prisma.etapaObra.updateMany({
      where: { etapaId, status: { in: STATUSES_VISTORIAVEL as any } },
      data: { status: "APROVADA_ENGENHEIRO" },
    });
    if (updated.count === 0) {
      throw new BadRequestException("Etapa não pode ser aprovada no status atual.");
    }

    await this.prisma.etapaAuditLog.create({
      data: { etapaId, acaoTipo: "APROVADA_ENGENHEIRO", usuarioId: engenheiroId, observacoes: observacoes ?? null },
    });

    // Notifica o construtor: aguardando validação do admin
    await this.notificacoes.criar(
      etapa.obra.usuarioId,
      "ETAPA_APROVADA",
      `Vistoria aprovada: ${etapa.nome}`,
      `O engenheiro aprovou a etapa "${etapa.nome}". Aguardando validação final do gestor para liberar a parcela.`,
      `/obras/${etapa.obra.obraId}`,
    );

    // Notifica admins/gestores sobre etapa aguardando validação final
    const admins = await this.prisma.usuario.findMany({
      where: { tipo: { in: ["ADMIN", "GESTOR"] as any }, deletadoEm: null },
      select: { usuarioId: true },
    });
    await Promise.all(
      admins.map((a) =>
        this.notificacoes.criar(
          a.usuarioId,
          "ETAPA_APROVADA",
          `Validação pendente: ${etapa.nome}`,
          `Engenheiro aprovou a etapa "${etapa.nome}" (obra "${etapa.obra.nome}"). Aguardando sua validação final para liberar a parcela.`,
          `/admin/etapas/${etapaId}/validar`,
        ),
      ),
    );

    this.pushNotificacoes
      .enviarPush({
        usuarioId: etapa.obra.usuarioId,
        titulo: `Vistoria aprovada: ${etapa.nome}`,
        mensagem: "Aguardando validação final do gestor para liberar a parcela.",
        tipo: "ETAPA_APROVADA",
        dados: { obraId: etapa.obra.obraId, etapaId },
      })
      .catch(() => {});

    return { ok: true, etapaId, status: "APROVADA_ENGENHEIRO" };
  }

  async rejeitar(engenheiroId: string, etapaId: string, motivo: string) {
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
      data: { etapaId, acaoTipo: "REJEITADA", usuarioId: engenheiroId, observacoes: motivo },
    });

    await this.notificacoes.criar(
      etapa.obra.usuarioId,
      "ETAPA_REPROVADA",
      `Etapa reprovada: ${etapa.nome}`,
      `A etapa "${etapa.nome}" foi reprovada. Motivo: ${motivo}`,
      `/obras/${etapa.obra.obraId}`,
    );

    return { ok: true, etapaId, status: "REPROVADA" };
  }
}
