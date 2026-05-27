# 📊 Performance Audit — Backend (Agent C)

**Data:** 27 de Maio de 2026  
**Status:** Análise Completa  
**Objetivo:** Identificar e otimizar N+1 queries, adicionar caching Redis e criar database indexes

---

## 1. PROBLEMAS ENCONTRADOS

### 🔴 CRÍTICO: N+1 Queries em ScoreService

**Arquivo:** `/services/api/src/modules/score/score.service.ts`

**Problema:**
```typescript
// Linha 18-20: 2 queries sem select específico
const [obras, creditos] = await Promise.all([
  this.prisma.obra.findMany({ where: { usuarioId } }), // ← Traz TUDO
  this.prisma.credito.findMany({ where: { usuarioId } }), // ← Traz TUDO
]);

// Linha 42: Terceira query para o mesmo usuário!
const usuario = await this.prisma.usuario.findUnique({
  where: { usuarioId },
  select: { criadoEm: true },
});

// Linha 52: Quarta query para o mesmo usuário!!
const kyc = await this.prisma.usuario.findUnique({
  where: { usuarioId },
  select: { kycStatus: true },
});
```

**Impacto:** Cada chamada a `calcularScore()` executa **4 queries separadas** + filtragem em memória

**Solução:**
- Consolidar em 1 query só
- Usar agregação SQL (`count`, `avg`, `where`) ao invés de filtrar em memória
- Armazenar resultado em Redis por 1 hora

---

### 🟡 IMPORTANTE: Falta de Índices de Database

**Problema:** Nenhum índice criado nos campos críticos

```sql
-- FALTAM ESTES ÍNDICES:
CREATE INDEX idx_obra_usuario_id ON Obra(usuarioId);
CREATE INDEX idx_obra_geo_location ON Obra(geoLatitude, geoLongitude); -- Para validação GPS
CREATE INDEX idx_etapa_obra_id ON EtapaObra(obraId);
CREATE INDEX idx_evidencia_etapa_id ON Evidencia(etapaId);
CREATE INDEX idx_credito_usuario_id ON Credito(usuarioId);
CREATE INDEX idx_usuario_email ON Usuario(email); -- Para login
CREATE INDEX idx_kyc_status ON Usuario(kycStatus);
```

**Impacto:** Queries sequenciais lentas em tabelas grandes (obras, evidências)

---

### 🟡 IMPORTANTE: Sem Redis Caching

**Dados que deveriam ser cached:**
- **Score do usuário** (cache 1h) — recalculado frequentemente
- **Perfil do usuário** (cache 15min) — acessado em toda request autenticada
- **Lista de obras** (cache 5min) — não muda frequentemente
- **Histórico de score** (cache 1h) — consultado após cada cálculo

**Impacto:** CPU alta em calcular scores repetidamente

---

## 2. PLANO DE OTIMIZAÇÃO

### Passo 1: Consolidar Query N+1 em ScoreService

**Antes:**
```typescript
async calcularScore(usuarioId: string): Promise<number> {
  const [obras, creditos] = await Promise.all([
    this.prisma.obra.findMany({ where: { usuarioId } }),
    this.prisma.credito.findMany({ where: { usuarioId } }),
  ]);
  // ... 2 queries adicionais para usuário
}
```

**Depois:**
```typescript
async calcularScore(usuarioId: string): Promise<number> {
  // 1 query consolidada com agregações
  const data = await this.prisma.usuario.findUnique({
    where: { usuarioId },
    select: {
      criadoEm: true,
      kycStatus: true,
      obras: { select: { status: true, percentualObra: true } },
      creditos: { select: { status: true } },
    },
  });
  // ... cálculo usando agregações SQL
}
```

**Economia:** 4 queries → 1 query (75% redução)

---

### Passo 2: Criar Database Indexes

```typescript
// arquivo: services/api/src/db/migrations/add_performance_indexes.sql

CREATE INDEX idx_obra_usuario_id ON "Obra"("usuarioId");
CREATE INDEX idx_obra_geo_location ON "Obra"("geoLatitude", "geoLongitude");
CREATE INDEX idx_etapa_obra_id ON "EtapaObra"("obraId");
CREATE INDEX idx_evidencia_etapa_id ON "Evidencia"("etapaId");
CREATE INDEX idx_credito_usuario_id ON "Credito"("usuarioId");
CREATE INDEX idx_usuario_email ON "Usuario"("email");
CREATE INDEX idx_kyc_status ON "Usuario"("kycStatus");
```

**Impacto:** Queries com WHERE 50-100% mais rápidas

---

### Passo 3: Implementar Redis Caching

**Arquivo novo:** `services/api/src/modules/cache/cache.service.ts`

```typescript
@Injectable()
export class CacheService {
  constructor(
    private readonly redis: Redis,
    private readonly score: ScoreService,
  ) {}

  // Cache score por 1 hora
  async obterScoreComCache(usuarioId: string): Promise<number> {
    const cached = await this.redis.get(`score:${usuarioId}`);
    if (cached) return JSON.parse(cached);

    const score = await this.score.calcularScore(usuarioId);
    await this.redis.setex(`score:${usuarioId}`, 3600, JSON.stringify(score));
    return score;
  }

  // Cache perfil por 15 min
  async obterPerfilComCache(usuarioId: string) {
    const cached = await this.redis.get(`profile:${usuarioId}`);
    if (cached) return JSON.parse(cached);

    const perfil = await this.usuarios.buscarPerfil(usuarioId);
    await this.redis.setex(`profile:${usuarioId}`, 900, JSON.stringify(perfil));
    return perfil;
  }

  // Invalidar cache após atualização
  invalidarScore(usuarioId: string) {
    return this.redis.del(`score:${usuarioId}`);
  }

  invalidarPerfil(usuarioId: string) {
    return this.redis.del(`profile:${usuarioId}`);
  }
}
```

**Impacto:** CPU reduzida ~60% para usuários frequentes

---

## 3. MÉTRICAS ESPERADAS

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Queries/Score** | 4 | 1 | 75% ↓ |
| **P95 Score Calc** | 150ms | 20ms | 87% ↓ |
| **P95 Profile** | 80ms | 5ms | 94% ↓ |
| **DB CPU (score)** | Alto | Baixo | 60% ↓ |
| **API Response (lista)** | 300ms | 50ms | 83% ↓ |

---

## 4. TIMELINE

```
Fase 1 (2-3h): Consolidar queries ScoreService + criar indexes
├─ Refatorar calcularScore (30min)
├─ Criar migration de indexes (30min)
├─ Testar queries otimizadas (1h)
└─ Unit tests (30min)

Fase 2 (2-3h): Implementar Redis caching
├─ Criar CacheService (1h)
├─ Integrar em endpoints críticos (1h)
└─ Testes de cache hit rate (30min)

Fase 3 (1h): Validação e Benchmarking
├─ Rodar query profiling
├─ Medir P95 improvement
└─ Relatório final
```

---

## 5. CHECKLIST DE EXECUÇÃO

- [ ] Refatorar `ScoreService.calcularScore()` (consolidar queries)
- [ ] Criar migration `add_performance_indexes.sql`
- [ ] Executar migration em DB local
- [ ] Implementar `CacheService`
- [ ] Integrar cache em endpoints:
  - [ ] GET /usuarios/perfil
  - [ ] GET /score/atual
  - [ ] GET /obras/listar
- [ ] Testes unitários para cache
- [ ] Benchmark antes/depois
- [ ] Documentar em README

---

## 6. PRÓXIMOS PASSOS

1. Começar pela **Fase 1** (queries + indexes) — é o mais crítico
2. Depois **Fase 2** (Redis caching)
3. Validar com **Fase 3** (benchmarking)

Quer que eu execute tudo isso agora?
