import { Processor, Process, OnQueueFailed, OnQueueCompleted } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../modules/prisma/prisma.service";
import { ScoreService } from "../modules/score/score.service";

export interface ScoreUpdateJob {
  usuarioId: string;
  creditoId?: string;
}

@Injectable()
@Processor("score-update")
export class ScoreUpdateWorker {
  private readonly logger = new Logger(ScoreUpdateWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoreService: ScoreService
  ) {}

  @Process()
  async handle(job: Job<ScoreUpdateJob>) {
    const { usuarioId, creditoId } = job.data;

    try {
      // Atualizar score do usuário
      await this.scoreService.recalcularScore(usuarioId);

      if (creditoId) {
        // Atualizar score do crédito se fornecido
        const credito = await this.prisma.credito.findUnique({
          where: { creditoId },
        });

        if (credito) {
          // Recalcular score baseado em etapas completadas
          const etapasCompletadas = await this.prisma.etapa.count({
            where: {
              creditoId,
              status: "CONCLUIDA",
            },
          });

          // Score simples baseado em progresso
          const scoreProgresso = Math.min((etapasCompletadas / 5) * 100, 100);

          await this.prisma.credito.update({
            where: { creditoId },
            data: { score: scoreProgresso },
          });
        }
      }

      this.logger.log(
        `Score atualizado com sucesso para usuário ${usuarioId}`
      );
    } catch (error) {
      this.logger.error(
        `Score update falhou para ${usuarioId}: ${error.message}`,
        error.stack
      );

      // Registra a falha no banco de dados
      await this.prisma.jobFalha.create({
        data: {
          queue: "score-update",
          jobId: String(job.id),
          payload: JSON.stringify(job.data),
          erro: error.message,
          tentativas: job.attemptsMade,
        },
      });

      // Re-throw para BullMQ retentar
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Score update job ${job.id} falhou: ${err.message}`
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Score update job ${job.id} completado com sucesso`);
  }
}
