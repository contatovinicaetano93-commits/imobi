import { Processor, Process, OnQueueFailed, OnQueueCompleted } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../modules/prisma/prisma.service";
import { NotificacoesService } from "../modules/notificacoes/notificacoes.service";
import { EmailService } from "../modules/email/email.service";
import { PushNotificacoesService } from "../modules/push-notificacoes/push-notificacoes.service";
import { LedgerService } from "../modules/ledger/ledger.service";
import { QUEUE_LIBERACAO, type LiberacaoJob } from "../common/constants";
import { liberacaoCounter } from "../common/utils/metrics.registry";

@Injectable()
@Processor(QUEUE_LIBERACAO)
export class LiberacaoParcelaWorker {
  private readonly logger = new Logger(LiberacaoParcelaWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
    private readonly pushNotificacoes: PushNotificacoesService,
    private readonly ledger: LedgerService,
  ) {}

  @Process()
  async handle(job: Job<LiberacaoJob>) {
    const { creditoId, liberacaoId, valor } = job.data;

    try {
      // Idempotency guard: if a previous attempt already committed, skip silently
      const liberacao = await this.prisma.liberacaoParcela.findUnique({
        where: { liberacaoId },
      });
      if (!liberacao || liberacao.status !== "PENDENTE") {
        this.logger.log(`Liberação ${liberacaoId} já processada ou aguardando pagamento manual, ignorando`);
        return;
      }

      const credito = await this.prisma.credito.findUnique({
        where: { creditoId },
        include: { usuario: true, obras: true },
      });
      if (!credito) throw new Error(`Crédito ${creditoId} não encontrado`);

      // Re-check + update atomically inside the transaction with advisory lock
      let processed = false;
      await this.prisma.$transaction(async (tx) => {
        // Distributed lock: prevents concurrent liberações on the same credito
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`liberacao:${creditoId}`}))`;

        const lib = await tx.liberacaoParcela.findUnique({ where: { liberacaoId } });
        if (!lib || lib.status !== "PENDENTE") return;

        // Ceiling enforcement: valorLiberado + valor must not exceed valorAprovado
        const creditoLocked = await tx.credito.findUnique({
          where: { creditoId },
          select: { valorAprovado: true, valorLiberado: true },
        });
        if (!creditoLocked) throw new Error(`Crédito ${creditoId} não encontrado`);

        const novoTotal = Number(creditoLocked.valorLiberado) + valor;
        if (novoTotal > Number(creditoLocked.valorAprovado) + 0.01) {
          throw new Error(
            `Teto de crédito excedido: aprovado=${creditoLocked.valorAprovado} liberado=${creditoLocked.valorLiberado} tentativa=${valor}`,
          );
        }

        await tx.credito.update({
          where: { creditoId },
          data: { valorLiberado: { increment: valor } },
        });

        await tx.liberacaoParcela.update({
          where: { liberacaoId },
          data: { status: "CONCLUIDA", processadoEm: new Date() },
        });

        // Ledger imutável — registra lançamento na mesma transação
        await this.ledger.criar(
          {
            tipo: "CREDITO",
            categoria: "LIBERACAO_PARCELA",
            valor,
            creditoId,
            liberacaoId,
            usuarioId: credito.usuarioId,
            descricao: `Liberação parcela — obra ${credito.obras?.[0]?.nome ?? creditoId}`,
            idempotencyKey: `liberacao:${liberacaoId}`,
          },
          tx,
        );

        // Audit trail
        await (tx as any).auditLog.create({
          data: {
            acao: 'LIBERACAO_PROCESSADA',
            entidade: 'LiberacaoParcela',
            entidadeId: liberacaoId,
            usuarioId: credito.usuarioId,
            metadata: { creditoId, valor, obraId: credito.obras?.[0]?.obraId ?? null },
          },
        });

        processed = true;
      });

      if (!processed) return;

      // Notifica usuário sobre liberação bem-sucedida
      const obra = credito.obras?.[0];
      const formattedValue = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(valor);

      await this.notificacoes.criar(
        credito.usuarioId,
        "PARCELA_LIBERADA",
        "Parcela liberada com sucesso",
        `Liberação de ${formattedValue} foi processada para ${obra?.nome || "sua obra"}.`,
        obra ? `/dashboard/obras/${obra.obraId}` : "/dashboard"
      );

      this.pushNotificacoes.enviarPush({
        usuarioId: credito.usuarioId,
        titulo: "Parcela Liberada!",
        mensagem: `${formattedValue} foi creditado para ${obra?.nome || "sua obra"}.`,
        tipo: "PARCELA_LIBERADA",
        dados: { creditoId, valor: String(valor) },
      }).catch((e) => this.logger.error(`Erro ao enviar push: ${e}`));

      this.email
        .parcelaLiberadaEmail(
          credito.usuario.nome,
          credito.usuario.email,
          valor,
          obra?.nome || "sua obra"
        )
        .catch((e) => this.logger.error(`Erro ao enviar email: ${e}`));

      liberacaoCounter.inc({ status: 'success' });
      this.logger.log(`Liberação processada para crédito ${creditoId}: R$ ${valor}`);
    } catch (error) {
      this.logger.error(`Erro ao processar liberação: ${error}`);
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    liberacaoCounter.inc({ status: 'error' });
    this.logger.error(`Job ${job.id} falhou: ${err.message}`);

    this.prisma.credito
      .findUnique({
        where: { creditoId: job.data.creditoId },
        include: { obras: true },
      })
      .then(async (credito) => {
        if (!credito) return;

        // Use updateMany with status filter to avoid clobbering a CONCLUIDA record
        // (job may have succeeded but crashed before BullMQ ACK)
        await this.prisma.liberacaoParcela.updateMany({
          where: { liberacaoId: job.data.liberacaoId, status: "PENDENTE" },
          data: { status: "FALHA", processadoEm: new Date() },
        });

        const obra = credito.obras?.[0];
        await this.notificacoes
          .criar(
            credito.usuarioId,
            "PARCELA_FALHA",
            "Erro na liberação da parcela",
            `Ocorreu um erro ao processar a liberação para ${obra?.nome || "sua obra"}. Por favor, contate o suporte.`,
            obra ? `/dashboard/obras/${obra.obraId}` : "/dashboard"
          )
          .catch((e) => this.logger.error(`Erro ao notificar falha: ${e}`));
      })
      .catch((e) => this.logger.error(`Erro ao processar falha de liberação: ${e}`));
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completado com sucesso`);
  }
}
