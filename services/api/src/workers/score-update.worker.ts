import { Logger } from "@nestjs/common";
import {
  Processor,
  Process,
  OnQueueFailed,
  OnQueueCompleted,
} from "@nestjs/bull";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Job } from "bull";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PrismaService } from "../modules/prisma/prisma.service";
import { ScoreService } from "../modules/score/score.service";

const QUEUE_SCORE_UPDATE = "score-update";

@Processor(QUEUE_SCORE_UPDATE)
export class ScoreUpdateWorker {
  private readonly logger = new Logger(ScoreUpdateWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoreService: ScoreService,
    @InjectQueue(QUEUE_SCORE_UPDATE) private scoreQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduleScoreUpdate() {
    this.logger.log("[ScoreUpdateWorker] Enqueuing daily score update job...");
    await this.scoreQueue.add({}, { removeOnComplete: true });
  }

  @Process()
  async handle(_job: Job) {
    this.logger.log(
      "[ScoreUpdateWorker] Starting daily score recalculation...",
    );

    try {
      // Buscar todos usuários ativos
      const usuarios = await this.prisma.usuario.findMany({
        where: {
          deletadoEm: null,
        },
      });

      let updated = 0;
      for (const usuario of usuarios) {
        try {
          await this.scoreService.recalcularScore(usuario.usuarioId);
          updated++;
        } catch (error) {
          this.logger.warn(
            `Failed to update score for usuario ${usuario.usuarioId}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `[ScoreUpdateWorker] Completed. Updated ${updated}/${usuarios.length} usuários`,
      );
      return { updatedCount: updated };
    } catch (error) {
      this.logger.error(
        `[ScoreUpdateWorker] Fatal error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`[ScoreUpdateWorker] Job completed: ${job.id}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `[ScoreUpdateWorker] Job failed: ${job.id} - ${error.message}`,
    );
  }
}
