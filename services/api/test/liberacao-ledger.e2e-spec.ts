/**
 * E2E: liberação → ledger flow
 *
 * Tests the full financial path: liberação job is processed → ledger entry is
 * created → valorLiberado is incremented → consistency check passes.
 *
 * Runs against an in-memory mock of Prisma so no real DB is required.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { LedgerService } from '../src/modules/ledger/ledger.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// ── Minimal Prisma mock ──────────────────────────────────────────────────────

const ledgerStore: Record<string, { valor: number; tipo: string }[]> = {};
const creditoStore: Record<string, { valorAprovado: number; valorLiberado: number }> = {};

const mockPrisma = {
  lancamentoFinanceiro: {
    create: jest.fn(async ({ data }: any) => {
      const key = data.creditoId;
      if (!ledgerStore[key]) ledgerStore[key] = [];
      ledgerStore[key].push({ valor: data.valor, tipo: data.tipo });
      return { lancamentoId: 'lc-' + Math.random(), ...data };
    }),
    findMany: jest.fn(async ({ where }: any) => ledgerStore[where.creditoId] ?? []),
    findFirst: jest.fn(async () => null),
    aggregate: jest.fn(async ({ where }: any) => {
      const entries = ledgerStore[where.creditoId] ?? [];
      const total = entries.reduce((s, e) => {
        return e.tipo === 'CREDITO' ? s + e.valor : s - e.valor;
      }, 0);
      return { _sum: { valor: total } };
    }),
  },
  credito: {
    findUnique: jest.fn(async ({ where }: any) => creditoStore[where.creditoId] ?? null),
    update: jest.fn(async ({ where, data }: any) => {
      const c = creditoStore[where.creditoId];
      if (c && data.valorLiberado?.increment) {
        c.valorLiberado += data.valorLiberado.increment;
      }
      return c;
    }),
  },
};

// ── Test suite ───────────────────────────────────────────────────────────────

describe('Liberação → Ledger (E2E integration)', () => {
  let ledger: LedgerService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    ledger = module.get(LedgerService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(ledgerStore).forEach((k) => delete ledgerStore[k]);
    Object.keys(creditoStore).forEach((k) => delete creditoStore[k]);
  });

  it('creates ledger entry and passes consistency check after liberação', async () => {
    const creditoId = 'credito-001';
    const usuarioId = 'usuario-001';
    const valor = 25000;

    // Simulate the credito row in DB
    creditoStore[creditoId] = { valorAprovado: 100000, valorLiberado: 0 };

    // Step 1: create ledger entry (what the liberacao worker does)
    await ledger.criar({
      tipo: 'CREDITO',
      categoria: 'LIBERACAO_PARCELA',
      valor,
      creditoId,
      usuarioId,
      idempotencyKey: `liberacao:lib-001`,
    });

    // Step 2: simulate credito.update increment
    creditoStore[creditoId].valorLiberado += valor;

    // Step 3: consistency check should pass
    const consistency = await ledger.verificarConsistencia(creditoId);
    expect(consistency.ok).toBe(true);
    expect(consistency.divergencia).toBeCloseTo(0);
  });

  it('detects divergence when ledger and cache are out of sync', async () => {
    const creditoId = 'credito-002';

    creditoStore[creditoId] = { valorAprovado: 100000, valorLiberado: 50000 };

    // Only record 40000 in ledger (simulating a lost/missing entry)
    await ledger.criar({
      tipo: 'CREDITO',
      categoria: 'LIBERACAO_PARCELA',
      valor: 40000,
      creditoId,
      usuarioId: 'u-002',
    });

    const consistency = await ledger.verificarConsistencia(creditoId);
    expect(consistency.ok).toBe(false);
    expect(Math.abs(consistency.divergencia)).toBeCloseTo(10000);
  });

  it('estorno creates DEBITO and restores consistency', async () => {
    const creditoId = 'credito-003';
    const usuarioId = 'usuario-003';
    const valor = 30000;

    creditoStore[creditoId] = { valorAprovado: 100000, valorLiberado: 0 };

    // Liberação
    await ledger.criar({
      tipo: 'CREDITO',
      categoria: 'LIBERACAO_PARCELA',
      valor,
      creditoId,
      usuarioId,
    });
    creditoStore[creditoId].valorLiberado += valor;

    // Estorno
    await ledger.criar({
      tipo: 'DEBITO',
      categoria: 'ESTORNO_LIBERACAO',
      valor,
      creditoId,
      usuarioId,
    });
    creditoStore[creditoId].valorLiberado -= valor;

    const consistency = await ledger.verificarConsistencia(creditoId);
    expect(consistency.ok).toBe(true);
    expect(consistency.divergencia).toBeCloseTo(0);
  });

  it('cursor pagination returns pages correctly', async () => {
    const creditoId = 'credito-004';

    mockPrisma.lancamentoFinanceiro.findMany.mockResolvedValueOnce([
      { lancamentoId: 'lc-1' },
      { lancamentoId: 'lc-2' },
      { lancamentoId: 'lc-3' }, // extra — signals hasMore
    ]);

    const page1 = await ledger.extratoCursor(creditoId, undefined, 2);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBe('lc-2');
    expect(page1.data).toHaveLength(2);

    mockPrisma.lancamentoFinanceiro.findMany.mockResolvedValueOnce([
      { lancamentoId: 'lc-3' },
    ]);

    const page2 = await ledger.extratoCursor(creditoId, 'lc-2', 2);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeUndefined();
    expect(page2.data).toHaveLength(1);
  });
});
