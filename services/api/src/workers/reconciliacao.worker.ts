import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { LedgerService } from "../modules/ledger/ledger.service";
import { PrismaService } from "../modules/prisma/prisma.service";
import { reconciliacaoDivergenciasCounter } from "../common/controllers/metrics.controller";
import { withRetry } from "../common/utils/retry.util";

/** Roda periodicamente para verificar integridade entre o ledger imutável e o cache valorLiberado. */
@Injectable()
export class ReconciliacaoWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReconciliacaoWorker.name);
  private running = false;
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly ledger: LedgerService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const interval = Number(process.env["RECONCILIACAO_INTERVAL_MS"] ?? "3600000");
    this.timer = setInterval(() => void this.reconciliar(), interval);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async reconciliar() {
    if (this.running) return;
    this.running = true;
    try {
      await this.executar();
    } finally {
      this.running = false;
    }
  }

  private async executar() {
    const creditos = await this.prisma.credito.findMany({
      where: { status: { in: ["ATIVO", "VENCIDO", "QUITADO"] } },
      select: { creditoId: true },
      take: 200,
    });

    const divergentes: { creditoId: string; divergencia: number }[] = [];

    for (const { creditoId } of creditos) {
      const result = await this.ledger.verificarConsistencia(creditoId);
      if (!result.ok) {
        divergentes.push({ creditoId, divergencia: result.divergencia });
        reconciliacaoDivergenciasCounter.inc();
        this.logger.error(
          `[RECONCILIAÇÃO] Divergência no crédito ${creditoId}: diff=${result.divergencia}`,
        );
      }
    }

    if (divergentes.length === 0) {
      this.logger.log(`[RECONCILIAÇÃO] OK — ${creditos.length} créditos verificados, sem divergências.`);
    } else {
      this.logger.error(
        `[RECONCILIAÇÃO] ATENÇÃO — ${divergentes.length}/${creditos.length} créditos com divergência.`,
      );
      await this.alertar(divergentes);
    }
  }

  /** Envia alerta para Slack se SLACK_WEBHOOK_URL estiver configurado. */
  private async alertar(divergentes: { creditoId: string; divergencia: number }[]) {
    const slackUrl = process.env["SLACK_WEBHOOK_URL"];
    if (!slackUrl) return;

    const lista = divergentes
      .slice(0, 10)
      .map((d) => `• creditoId=${d.creditoId} diff=R$${d.divergencia.toFixed(2)}`)
      .join("\n");

    const body = JSON.stringify({
      text: `:rotating_light: *Reconciliação imbobi* — ${divergentes.length} divergência(s) detectada(s)\n${lista}`,
    });

    try {
      await withRetry(
        () =>
          fetch(slackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          }),
        { retries: 2, baseMs: 500 },
      );
    } catch (err) {
      this.logger.error(`Falha ao enviar alerta Slack: ${err}`);
    }
  }
}
