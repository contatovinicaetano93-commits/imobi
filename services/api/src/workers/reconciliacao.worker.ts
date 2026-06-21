import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { LedgerService } from "../modules/ledger/ledger.service";
import { PrismaService } from "../modules/prisma/prisma.service";

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

    let divergencias = 0;
    for (const { creditoId } of creditos) {
      const result = await this.ledger.verificarConsistencia(creditoId);
      if (!result.ok) {
        divergencias++;
        this.logger.error(
          `[RECONCILIAÇÃO] Divergência no crédito ${creditoId}: diff=${result.divergencia}`,
        );
      }
    }

    if (divergencias === 0) {
      this.logger.log(`[RECONCILIAÇÃO] OK — ${creditos.length} créditos verificados, nenhuma divergência.`);
    } else {
      this.logger.error(`[RECONCILIAÇÃO] ATENÇÃO — ${divergencias}/${creditos.length} créditos com divergência.`);
    }
  }
}
