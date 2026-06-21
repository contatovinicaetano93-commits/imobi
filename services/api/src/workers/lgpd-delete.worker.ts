import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';

const GRACE_DAYS = Number(process.env['EXCLUSAO_GRACE_PERIOD_DAYS'] ?? '30');

@Injectable()
export class LgpdDeleteWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LgpdDeleteWorker.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.processar(), 24 * 60 * 60 * 1000);
    void this.processar();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async processar() {
    await this.anonimizarUsuarios();
    await this.limparIdempotencyExpirados();
  }

  private async anonimizarUsuarios() {
    const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000);
    try {
      const usuarios = await this.prisma.usuario.findMany({
        where: { deletadoEm: { lt: cutoff }, nome: { not: '[DELETADO]' } },
        select: { usuarioId: true },
        take: 100,
      });

      for (const { usuarioId } of usuarios) {
        // Anonimiza PII preservando integridade do ledger (não hard delete)
        await this.prisma.usuario.update({
          where: { usuarioId },
          data: {
            nome: '[DELETADO]',
            email: `deleted-${usuarioId}@anon.imobi`,
            cpf: '00000000000',
            telefone: '00000000000',
            contaBanco: null,
            contaAgencia: null,
            contaNumero: null,
            contaPix: null,
            contaTitular: null,
            avatarUrl: null,
            passwordHash: 'ANONIMIZADO',
            passwordResetToken: null,
          },
        });
      }

      if (usuarios.length > 0) {
        this.logger.log(`LGPD: ${usuarios.length} usuário(s) anonimizados`);
      }
    } catch (err) {
      this.logger.error(`Erro LGPD anonimização: ${err}`);
    }
  }

  private async limparIdempotencyExpirados() {
    try {
      const result = await this.prisma.idempotencyRecord.deleteMany({
        where: { expiraEm: { lt: new Date() } },
      });
      if (result.count > 0) {
        this.logger.log(`Cleanup: ${result.count} registro(s) de idempotência expirados removidos`);
      }
    } catch (err) {
      this.logger.error(`Erro limpeza idempotency: ${err}`);
    }
  }
}
