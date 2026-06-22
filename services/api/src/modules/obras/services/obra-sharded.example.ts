import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../../modules/prisma/prisma.service';
import { ShardingService } from '../../../common/scalability/sharding.service';
import { MultiTierCacheService } from '../../../common/scalability/multi-tier-cache.service';
import { StructuredLoggerService } from '../../../common/logging/structured-logger.service';

/**
 * EXEMPLO DE IMPLEMENTAÇÃO COM SHARDING
 *
 * Padrões aplicados:
 * - Data sharding by usuarioId (consistent hashing)
 * - Multi-tier caching (L1/L2/L3)
 * - Validation that request goes to correct shard
 * - Cache invalidation on updates
 *
 * NOTA: Este é um exemplo conceitual. Adaptar para o schema real da aplicação.
 */

@Injectable()
export class ObraShardedExampleService {
  constructor(
    private db: PrismaService,
    private sharding: ShardingService,
    private cache: MultiTierCacheService,
    private logger: StructuredLoggerService,
  ) {}

  /**
   * Exemplo: Listar obras do usuário (com sharding validação)
   *
   * Fluxo:
   * 1. Validar que este shard é proprietário do usuário
   * 2. Tentar cache (L1/L2)
   * 3. Se cache miss, consultar database
   * 4. Repovoar cache
   */
  async listarObrasDoUsuario(usuarioId: string) {
    const start = Date.now();

    try {
      // 1. Validar se este shard é responsável por este usuário
      const shardInfo = this.sharding.getShardInfo(usuarioId);
      if (!shardInfo.belongsToThisShard) {
        this.logger.warn('Request to wrong shard', {
          usuarioId,
          requestedShard: shardInfo.shardId,
          expectedShard: this.sharding.getAllShards().currentShard,
        });
        throw new ServiceUnavailableException(
          `User data on shard ${shardInfo.shardId}. Please route to correct instance.`,
        );
      }

      // 2. Tentar cache
      const cacheKey = `obras:usuario:${usuarioId}`;
      const cached = await this.cache.get<any[]>(cacheKey);
      if (cached) {
        const duration = Date.now() - start;
        this.logger.logPerformance('listarObrasDoUsuario (cache hit)', duration, {
          usuarioId,
          count: cached?.length || 0,
        });
        return cached || [];
      }

      // 3. Cache miss: consultar database
      // Adaptar a query real de acordo com schema da aplicação
      const obras = (await (this.db as any).obra.findMany({
        where: { usuarioId },
        orderBy: { criadoEm: 'desc' },
      })) as any[];

      // 4. Repovoar cache (10 minutos)
      await this.cache.set(cacheKey, obras, 600);

      const duration = Date.now() - start;
      this.logger.logPerformance('listarObrasDoUsuario (database)', duration, {
        usuarioId,
        count: obras?.length || 0,
        shard: shardInfo.shardId,
      });

      return obras;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error('Falha ao listar obras', {
        usuarioId,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Exemplo: Criar nova obra (com invalidação de cache)
   *
   * Fluxo:
   * 1. Validar sharding
   * 2. Validar entrada
   * 3. Criar no database
   * 4. Invalidar cache do usuário
   * 5. Retornar obra criada
   */
  async criarObra(usuarioId: string, data: any) {
    const start = Date.now();

    try {
      // 1. Validar sharding
      const shardInfo = this.sharding.getShardInfo(usuarioId);
      if (!shardInfo.belongsToThisShard) {
        throw new ServiceUnavailableException('Wrong shard for this user');
      }

      // 2. Validar entrada
      if (!data.nome) {
        throw new BadRequestException('Nome é obrigatório');
      }

      // 3. Criar no database
      // Adaptar para schema real
      const obra = (await (this.db as any).obra.create({
        data: {
          usuarioId,
          nome: data.nome,
          status: 'ATIVA',
        },
      })) as any;

      // 4. Invalidar cache do usuário (lista de obras)
      await this.cache.invalidate(`obras:usuario:${usuarioId}`);

      const duration = Date.now() - start;
      this.logger.log('Obra criada com sucesso', {
        usuarioId,
        obraId: obra?.id || 'unknown',
        nome: obra?.nome || data.nome,
        duration,
        shard: shardInfo.shardId,
      });

      return obra;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error('Falha ao criar obra', {
        usuarioId,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Exemplo: Obter obra com dados relacionados (cache estratégico)
   *
   * Fluxo:
   * 1. Validar sharding
   * 2. Tentar cache
   * 3. Se cache miss, buscar dados
   * 4. Repovoar cache
   */
  async getObraComDetalhes(usuarioId: string, obraId: string) {
    const start = Date.now();

    try {
      // 1. Validar sharding
      if (!this.sharding.belongsToThisShard(usuarioId)) {
        throw new ServiceUnavailableException('Wrong shard for this user');
      }

      // 2. Tentar cache
      const cacheKey = `obra:${obraId}:usuario:${usuarioId}:full`;
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) {
        const duration = Date.now() - start;
        this.logger.logPerformance('getObraComDetalhes (cache)', duration, {
          usuarioId,
          obraId,
        });
        return cached;
      }

      // 3. Cache miss: buscar tudo
      // Adaptar para schema real
      const obra = (await (this.db as any).obra.findUnique({
        where: { id: obraId },
      })) as any;

      if (!obra || obra.usuarioId !== usuarioId) {
        throw new BadRequestException('Obra não encontrada ou não pertence a este usuário');
      }

      // 4. Repovoar cache (30 minutos para dados detalhados)
      await this.cache.set(cacheKey, obra, 1800);

      const duration = Date.now() - start;
      this.logger.logPerformance('getObraComDetalhes (database)', duration, {
        usuarioId,
        obraId,
      });

      return obra;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error('Falha ao obter obra com detalhes', {
        usuarioId,
        obraId,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Exemplo: Atualizar obra (com cascata de invalidações)
   *
   * Fluxo:
   * 1. Validar sharding
   * 2. Validar proprietário
   * 3. Atualizar database
   * 4. Invalidar múltiplos caches relacionados
   */
  async atualizarObra(usuarioId: string, obraId: string, data: any) {
    const start = Date.now();

    try {
      // 1. Validar sharding
      if (!this.sharding.belongsToThisShard(usuarioId)) {
        throw new ServiceUnavailableException('Wrong shard for this user');
      }

      // 2. Validar proprietário
      const obraExistente = (await (this.db as any).obra.findUnique({
        where: { id: obraId },
      })) as any;

      if (!obraExistente || obraExistente.usuarioId !== usuarioId) {
        throw new BadRequestException('Obra não encontrada ou não pertence a este usuário');
      }

      // 3. Atualizar database
      const obra = (await (this.db as any).obra.update({
        where: { id: obraId },
        data: {
          nome: data.nome || obraExistente.nome,
        },
      })) as any;

      // 4. Invalidar caches relacionados
      await this.cache.invalidate(`obra:${obraId}:usuario:${usuarioId}:full`);
      await this.cache.invalidate(`obras:usuario:${usuarioId}`);
      await this.cache.invalidatePattern(`credito:.*:obra:${obraId}`);

      const duration = Date.now() - start;
      this.logger.log('Obra atualizada com sucesso', {
        usuarioId,
        obraId,
        duration,
      });

      return obra;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error('Falha ao atualizar obra', {
        usuarioId,
        obraId,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get sharding info for monitoring
   */
  getShardingInfo() {
    return this.sharding.getAllShards();
  }
}
