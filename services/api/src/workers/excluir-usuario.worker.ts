import { Processor, Process, OnQueueFailed, OnQueueCompleted } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../modules/prisma/prisma.service";
import { EmailService } from "../modules/email/email.service";

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
      const graceDays = Number(process.env.EXCLUSAO_GRACE_PERIOD_DAYS ?? "30");
      const agora = new Date();
      const diasDesdeDelecao = (agora.getTime() - usuario.deletadoEm!.getTime()) / (1000 * 60 * 60 * 24);

      if (diasDesdeDelecao < graceDays) {
        this.logger.warn(
          `Tentativa de deletar usuário ${usuarioId} com apenas ${diasDesdeDelecao.toFixed(1)} dias - ignorando`
        );
        return;
      }

      // Anonymize PII — hard deletion is blocked by RESTRICT constraints on
      // LancamentoFinanceiro (ledger integrity, 7-year regulatory retention).
      // Sessions, notifications, and push tokens are deleted; everything else
      // (creditos, obras, lancamentos) is preserved with PII scrubbed.
      await this.prisma.$transaction(async (tx) => {
        await tx.sessaoToken.deleteMany({ where: { usuarioId } });
        await tx.notificacao.deleteMany({ where: { usuarioId } });
        await tx.usuarioFcmToken.deleteMany({ where: { usuarioId } });
        await tx.scoreHistorico.deleteMany({ where: { usuarioId } });

        // Anonymize PII — preserves ledger + KYC/audit records (AML + regulatory)
        await tx.usuario.update({
          where: { usuarioId },
          data: {
            nome: "[DELETADO]",
            email: `deleted-${usuarioId}@anon.imobi`,
            cpf: "00000000000",
            telefone: "00000000000",
            contaBanco: null,
            contaAgencia: null,
            contaNumero: null,
            contaPix: null,
            contaTitular: null,
            avatarUrl: null,
            passwordHash: "ANONIMIZADO",
            passwordResetToken: null,
            passwordResetExpires: null,
          },
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
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job de exclusão de usuário ${job.data.usuarioId} falhou: ${err.message}`);
    // The job will be retried based on the queue configuration (3 attempts with exponential backoff)
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Job de exclusão de usuário ${job.data.usuarioId} completado`);
  }
}
