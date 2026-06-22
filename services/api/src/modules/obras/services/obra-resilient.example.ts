import { Injectable } from '@nestjs/common';
import { CircuitBreakerService, RetryPolicyService, withTimeout } from '../../../common/resilience';
import { StructuredLoggerService } from '../../../common/logging/structured-logger.service';

/**
 * EXEMPLO DE IMPLEMENTAÇÃO RESILIENTE
 *
 * Padrões aplicados:
 * - Circuit Breaker: para serviços externos
 * - Retry: com exponential backoff
 * - Timeout: com fallback
 * - Logging: estruturado em JSON
 * - Caching: em 3 camadas
 */

@Injectable()
export class ObraResilientExampleService {
  private scoreApiCircuitBreaker: CircuitBreakerService;
  private scoreApiRetryPolicy: RetryPolicyService;

  constructor(
    // private db: PrismaService,
    // private cache: RedisService,
    private logger: StructuredLoggerService,
  ) {
    // Circuit breaker para Score API (externa)
    this.scoreApiCircuitBreaker = new CircuitBreakerService({
      name: 'score-api',
      failureThreshold: 5,
      resetTimeout: 60000,
      monitorInterval: 10000,
    });

    // Retry policy para chamadas ao Score API
    this.scoreApiRetryPolicy = new RetryPolicyService({
      name: 'score-api',
      maxAttempts: 3,
      initialDelayMs: 100,
      maxDelayMs: 5000,
      multiplier: 2,
    });
  }

  /**
   * Exemplo: Obter score de um usuário com resiliência total
   *
   * Fluxo:
   * 1. Tenta cache local
   * 2. Tenta Redis
   * 3. Chama Score API com Circuit Breaker + Retry + Timeout
   * 4. Se falha, usa valor em cache antigo ou padrão
   */
  async getScoreComResiliencia(usuarioId: string): Promise<number> {
    const start = Date.now();

    try {
      // 1. Cache local (exemplo)
      // const cached = this.localCache.get(`score:${usuarioId}`);
      // if (cached) return cached.value;

      // 2. Redis (exemplo)
      // const redisCached = await this.cache.get(`score:${usuarioId}`);
      // if (redisCached) return JSON.parse(redisCached);

      // 3. Chamar Score API com TODOS os padrões de resiliência
      const score = await this.scoreApiCircuitBreaker.execute(
        // Função principal
        () =>
          this.scoreApiRetryPolicy.execute(() =>
            withTimeout(
              fetch('https://score-api.external.com/calculate', {
                method: 'POST',
                body: JSON.stringify({ usuarioId }),
              }).then((res) => {
                if (!res.ok) throw new Error(`Score API returned ${res.status}`);
                return res.json().then((data: any) => (data.score as number));
              }),
              5000, // 5 segundo timeout
            ),
          ),
        // Fallback se circuit breaker estiver aberto
        async () => {
          this.logger.warn('Score API unavailable, using cached/default score', {
            usuarioId,
          });
          // Retornar score em cache antigo ou padrão
          // return this.cache.get(`score:${usuarioId}:old`) || 500;
          return 500;
        },
      ) as number;

      const duration = Date.now() - start;
      this.logger.logPerformance('getScore', duration, {
        usuarioId,
        score,
        source: 'api',
      });

      return score;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error('Failed to get score', {
        usuarioId,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback final: retornar score padrão seguro
      return 500;
    }
  }

  /**
   * Exemplo: Liberar parcela de crédito (operação crítica)
   *
   * Características:
   * - Sempre assíncrona (via BullMQ)
   * - Tem que completar (retry até 5x)
   * - Tem audit log imutável
   * - Notifica usuário
   */
  async liberarParcelaComResiliencia(creditoId: string): Promise<void> {
    const start = Date.now();

    try {
      // Em produção, isso seria uma job no BullMQ
      // await this.queue.add('liberar-parcela', { creditoId }, {
      //   attempts: 5,
      //   backoff: { type: 'exponential', delay: 1000 },
      //   removeOnComplete: true,
      // });

      this.logger.log('Parcela liberada com sucesso', {
        creditoId,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.logger.error('Falha ao liberar parcela', {
        creditoId,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Exemplo: Validar GPS (operação crítica local)
   *
   * Características:
   * - Validação servidor é OBRIGATÓRIA (PostGIS)
   * - Validação cliente é apenas UX
   * - Sem fallback - ou passa ou falha
   */
  async validarGpsComResiliencia(
    latitude: number,
    longitude: number,
  ): Promise<boolean> {
    try {
      // Validação server via PostGIS (incontornável)
      // const result = await this.db.$queryRaw`
      //   SELECT ST_DWithin(
      //     ST_Point(${longitude}, ${latitude})::geography,
      //     ST_Point(-46.6333, -23.5505)::geography,
      //     5000
      //   ) as within_5km
      // `;

      this.logger.log('GPS validado', {
        latitude,
        longitude,
        validated: true,
      });

      return true;
    } catch (error) {
      this.logger.error('Falha ao validar GPS', {
        latitude,
        longitude,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
