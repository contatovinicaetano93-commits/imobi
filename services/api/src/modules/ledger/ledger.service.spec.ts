import { Test } from '@nestjs/testing';
import { LedgerService } from './ledger.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  lancamentoFinanceiro: {
    create: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  credito: {
    findUnique: jest.fn(),
  },
};

describe('LedgerService', () => {
  let service: LedgerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(LedgerService);
  });

  describe('verificarConsistencia', () => {
    it('returns ok=true when ledger sum matches valorLiberado', async () => {
      mockPrisma.credito.findUnique.mockResolvedValue({ valorLiberado: 50000 });
      mockPrisma.lancamentoFinanceiro.aggregate.mockResolvedValue({ _sum: { valor: 50000 } });

      const result = await service.verificarConsistencia('credito-123');

      expect(result.ok).toBe(true);
      expect(result.divergencia).toBeCloseTo(0);
    });

    it('returns ok=false when there is a divergence > 0.01', async () => {
      mockPrisma.credito.findUnique.mockResolvedValue({ valorLiberado: 50000 });
      mockPrisma.lancamentoFinanceiro.aggregate.mockResolvedValue({ _sum: { valor: 49990 } });

      const result = await service.verificarConsistencia('credito-123');

      expect(result.ok).toBe(false);
      expect(result.divergencia).toBeCloseTo(10);
    });

    it('returns ok=false when credito is not found', async () => {
      mockPrisma.credito.findUnique.mockResolvedValue(null);
      mockPrisma.lancamentoFinanceiro.aggregate.mockResolvedValue({ _sum: { valor: 0 } });

      const result = await service.verificarConsistencia('missing');

      expect(result.ok).toBe(false);
    });

    it('treats null ledger sum as 0', async () => {
      mockPrisma.credito.findUnique.mockResolvedValue({ valorLiberado: 0 });
      mockPrisma.lancamentoFinanceiro.aggregate.mockResolvedValue({ _sum: { valor: null } });

      const result = await service.verificarConsistencia('credito-zero');

      expect(result.ok).toBe(true);
    });
  });

  describe('extratoCursor', () => {
    it('returns hasMore=false when items <= take', async () => {
      const items = [{ lancamentoId: 'a' }, { lancamentoId: 'b' }];
      mockPrisma.lancamentoFinanceiro.findMany.mockResolvedValue(items);

      const result = await service.extratoCursor('credito-1', undefined, 20);

      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
      expect(result.data).toHaveLength(2);
    });

    it('returns nextCursor when items > take', async () => {
      // take=2, return 3 items to signal hasMore
      const items = [
        { lancamentoId: 'a' },
        { lancamentoId: 'b' },
        { lancamentoId: 'c' }, // extra item
      ];
      mockPrisma.lancamentoFinanceiro.findMany.mockResolvedValue(items);

      const result = await service.extratoCursor('credito-1', undefined, 2);

      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('b');
      expect(result.data).toHaveLength(2);
    });

    it('caps take at 100', async () => {
      mockPrisma.lancamentoFinanceiro.findMany.mockResolvedValue([]);

      await service.extratoCursor('credito-1', undefined, 9999);

      expect(mockPrisma.lancamentoFinanceiro.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 101 }), // limit 100 + 1
      );
    });
  });
});
