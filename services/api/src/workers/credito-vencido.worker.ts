import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class CreditoVencidoWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CreditoVencidoWorker.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const intervalMs = Number(process.env['CREDITO_VENCIDO_INTERVAL_MS'] ?? '21600000'); // 6h
    this.timer = setInterval(() => void this.processarVencidos(), intervalMs);
    void this.processarVencidos();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async processarVencidos() {
    try {
      const result = await this.prisma.credito.updateMany({
        where: {
          status: 'ATIVO',
          dataVencimento: { lt: new Date() },
        },
        data: { status: 'VENCIDO' },
      });
      if (result.count > 0) {
        this.logger.warn(`Marcados ${result.count} crédito(s) como VENCIDO`);
      }
    } catch (err) {
      this.logger.error(`Erro ao processar créditos vencidos: ${err}`);
    }
  }
}
