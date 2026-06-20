import { Processor, Process, OnQueueFailed, OnQueueCompleted } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../modules/prisma/prisma.service";
import { EmailService } from "../modules/email/email.service";
import { alertarSlack } from "../common/slack-alert";

export const QUEUE_EXCLUIR_USUARIO = "excluir-usuario";

export interface ExcluirUsuarioJob {
  usuarioId: string;
}

/**
 * BullMQ Worker for LGPD Article 17 Hard Deletion
 * Runs 30 days after user initiates account deletion
 * Performs irreversible hard delete of all user data except legally-required audit logs
 */
@Injectable()
@Processor(QUEUE_EXCLUIR_USUARIO)
export class ExcluirUsuarioWorker {
  private readonly logger = new Logger(ExcluirUsuarioWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService
  ) {}

  @Process("hard-delete")
  async handle(job: Job<ExcluirUsuarioJob>) {
    const { usuarioId } = job.data;

    try {
      const usuario = await this.prisma.usuario.findUnique({
        where: { usuarioId },
        select: { email: true, nome: true, deletadoEm: true },
      });

      if (!usuario) {
        this.logger.warn(`Usuário ${usuarioId} não encontrado - já pode estar deletado`);
        return;
      }

      // Verify that the user was actually marked for deletion 30+ days ago
      const agora = new Date();
      const diasDesdeDelecao = (agora.getTime() - usuario.deletadoEm!.getTime()) / (1000 * 60 * 60 * 24);

      if (diasDesdeDelecao < 30) {
        this.logger.warn(
          `Tentativa de deletar usuário ${usuarioId} com apenas ${diasDesdeDelecao.toFixed(1)} dias - ignorando`
        );
        return;
      }

      // Perform hard deletion in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Delete non-sensitive data in order of dependencies

        // 1. Delete session tokens
        await tx.sessaoToken.deleteMany({
          where: { usuarioId },
        });

        // 2. Delete notifications
        await tx.notificacao.deleteMany({
          where: { usuarioId },
        });

        // 3. Delete FCM tokens
        await tx.usuarioFcmToken.deleteMany({
          where: { usuarioId },
        });

        // 4. Delete score history
        await tx.scoreHistorico.deleteMany({
          where: { usuarioId },
        });

        // 5. Delete obras (cascades to etapas and evidencias via foreign key)
        await tx.obra.deleteMany({
          where: { usuarioId },
        });

        // 6. Delete creditos (cascades to liberacaoParcela via foreign key)
        await tx.credito.deleteMany({
          where: { usuarioId },
        });

        // NOTE: KycDocumento NOT deleted (5-year AML requirement per LGPD Article 16)
        // NOTE: EtapaAuditLog NOT deleted (7-year regulatory requirement per LGPD Article 27)
        // NOTE: KycAuditLog NOT deleted (7-year regulatory requirement per LGPD Article 27)

        // 7. Finally delete the usuario record itself
        await tx.usuario.delete({
          where: { usuarioId },
        });
      });

      this.logger.log(`Usuário ${usuarioId} deletado com sucesso após período de graça de 30 dias`);

      // Send confirmation email to the email address (before it's deleted)
      this.email
        .contaExcluida(usuario.nome, usuario.email)
        .catch((e) => this.logger.error(`Erro ao enviar email de exclusão confirmada: ${e}`));
    } catch (error) {
      this.logger.error(`Erro ao deletar usuário ${usuarioId}: ${error}`);
      throw error;
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job, err: Error) {
    this.logger.error(`Job de exclusão de usuário ${job.data.usuarioId} falhou: ${err.message}`);
    await alertarSlack(
      `🚨 *Exclusão de Usuário (LGPD) — Falha*\nJob ID: ${job.id} | Tentativas: ${job.attemptsMade}\nUsuário: \`${job.data.usuarioId}\`\nErro: ${err.message}\n⚠️ Requer atenção manual para garantir conformidade LGPD.`
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Job de exclusão de usuário ${job.data.usuarioId} completado`);
  }
}
