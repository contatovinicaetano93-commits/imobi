import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bull";
import { InjectQueue } from "@nestjs/bull";
import { QUEUE_LIBERACAO } from "./constants";

@Injectable()
export class QueueMonitoringService {
  private readonly logger = new Logger(QueueMonitoringService.name);

  constructor(
    @InjectQueue(QUEUE_LIBERACAO)
    private readonly liberacaoQueue: Queue,
  ) {
    this.setupQueueListeners();
  }

  private setupQueueListeners() {
    // Monitor queue events for logging
    this.liberacaoQueue.on("error", (error) => {
      this.logger.error(`Queue error: ${error.message}`, error.stack);
    });

    this.liberacaoQueue.on("active", (job) => {
      this.logger.debug(`Job ${job.id} iniciado: ${job.name}`);
    });

    this.liberacaoQueue.on("progress", (job, progress) => {
      this.logger.debug(`Job ${job.id} progresso: ${progress}%`);
    });

    this.liberacaoQueue.on("stalled", (job) => {
      this.logger.warn(`Job ${job.id} travado (stalled), será retentado`);
    });
  }

  async getQueueStats() {
    try {
      const [active, waiting, completed, failed] = await Promise.all([
        this.liberacaoQueue.getActiveCount(),
        this.liberacaoQueue.getWaitingCount(),
        this.liberacaoQueue.getCompletedCount(),
        this.liberacaoQueue.getFailedCount(),
      ]);

      return {
        queue: QUEUE_LIBERACAO,
        active,
        waiting,
        completed,
        failed,
        total: active + waiting + completed + failed,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Erro ao obter stats da fila: ${error.message}`);
      return {
        queue: QUEUE_LIBERACAO,
        active: 0,
        waiting: 0,
        completed: 0,
        failed: 0,
        total: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  async getFailedJobs(limit: number = 100) {
    try {
      const failedJobs = await this.liberacaoQueue.getFailed(0, limit);
      return failedJobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        stacktrace: job.stacktrace,
      }));
    } catch (error) {
      this.logger.error(`Erro ao obter jobs falhados: ${error.message}`);
      return [];
    }
  }

  async getActiveJobs() {
    try {
      const activeJobs = await this.liberacaoQueue.getActiveCount();
      const jobs = await this.liberacaoQueue.getActive();
      return jobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress(),
        attempts: job.attemptsMade,
      }));
    } catch (error) {
      this.logger.error(`Erro ao obter jobs ativos: ${error.message}`);
      return [];
    }
  }

  async cleanQueue(status: "failed" | "completed" = "completed", maxAge: number = 86400000) {
    try {
      const count = await this.liberacaoQueue.clean(maxAge, 1000, status);
      this.logger.log(`Limpeza de fila (${status}): ${count} jobs removidos`);
      return { success: true, cleaned: count };
    } catch (error) {
      this.logger.error(`Erro ao limpar fila: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
