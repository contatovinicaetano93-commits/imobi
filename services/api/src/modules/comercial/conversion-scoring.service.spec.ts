import { Test, TestingModule } from '@nestjs/testing';
import { ConversionScoringService } from './conversion-scoring.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ConversionScoringService', () => {
  let service: ConversionScoringService;
  let prisma: PrismaService;

  const mockPrismaService = {
    lead: {
      findUnique: jest.fn(),
    },
    conversionScore: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversionScoringService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ConversionScoringService>(ConversionScoringService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calcularFonteScore', () => {
    it('should return correct score for PARCEIRO (90)', () => {
      const result = service['calcularFonteScore']('PARCEIRO');
      expect(result).toBe(90);
    });

    it('should return correct score for INDICACAO (85)', () => {
      const result = service['calcularFonteScore']('INDICACAO');
      expect(result).toBe(85);
    });

    it('should return correct score for WEBSITE (80)', () => {
      const result = service['calcularFonteScore']('WEBSITE');
      expect(result).toBe(80);
    });

    it('should return default score (60) for unknown fonte', () => {
      const result = service['calcularFonteScore']('UNKNOWN');
      expect(result).toBe(60);
    });

    it('should clamp score between 0 and 100', () => {
      const result = service['calcularFonteScore']('OFFLINE');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('calcularTipoObraScore', () => {
    it('should return 85 for residencial', () => {
      const result = service['calcularTipoObraScore']('residencial');
      expect(result).toBe(85);
    });

    it('should return 80 for comercial', () => {
      const result = service['calcularTipoObraScore']('comercial');
      expect(result).toBe(80);
    });

    it('should return 70 (default) when tipoObra is undefined', () => {
      const result = service['calcularTipoObraScore'](undefined);
      expect(result).toBe(70);
    });

    it('should be case-insensitive', () => {
      const result1 = service['calcularTipoObraScore']('RESIDENCIAL');
      const result2 = service['calcularTipoObraScore']('residencial');
      expect(result1).toBe(result2);
    });
  });

  describe('calcularSegmentoScore', () => {
    it('should return 85 for RETORNO', () => {
      const result = service['calcularSegmentoScore']('RETORNO');
      expect(result).toBe(85);
    });

    it('should return 70 for NOVO', () => {
      const result = service['calcularSegmentoScore']('NOVO');
      expect(result).toBe(70);
    });

    it('should return 65 for CONCORRENTE', () => {
      const result = service['calcularSegmentoScore']('CONCORRENTE');
      expect(result).toBe(65);
    });

    it('should return default 70 for unknown segmento', () => {
      const result = service['calcularSegmentoScore']('UNKNOWN');
      expect(result).toBe(70);
    });
  });

  describe('calcularEngajamentoScore', () => {
    it('should return 20 for 0 activities', () => {
      const result = service['calcularEngajamentoScore']([], undefined);
      expect(result).toBe(20);
    });

    it('should return 40 for 1 activity', () => {
      const result = service['calcularEngajamentoScore']([{}], undefined);
      expect(result).toBe(40);
    });

    it('should return 60 for 2 activities', () => {
      const result = service['calcularEngajamentoScore']([{}, {}], undefined);
      expect(result).toBe(60);
    });

    it('should return 80 for 3-5 activities', () => {
      const result = service['calcularEngajamentoScore']([{}, {}, {}, {}, {}], undefined);
      expect(result).toBe(80);
    });

    it('should return 95 for 5+ activities', () => {
      const result = service['calcularEngajamentoScore'](
        [{}, {}, {}, {}, {}, {}],
        undefined
      );
      expect(result).toBe(95);
    });

    it('should apply -50% decay for 30+ days without activity', () => {
      const date = new Date();
      date.setDate(date.getDate() - 31);
      const result = service['calcularEngajamentoScore']([{}, {}, {}], date);
      expect(result).toBeLessThan(60 * 0.5 + 5);
    });

    it('should apply -30% decay for 14-30 days without activity', () => {
      const date = new Date();
      date.setDate(date.getDate() - 20);
      const result = service['calcularEngajamentoScore']([{}, {}, {}], date);
      expect(result).toBeLessThan(60);
    });

    it('should apply -15% decay for 7-14 days without activity', () => {
      const date = new Date();
      date.setDate(date.getDate() - 10);
      const result = service['calcularEngajamentoScore']([{}, {}, {}], date);
      expect(result).toBeLessThan(60);
    });

    it('should clamp result between 0 and 100', () => {
      const result = service['calcularEngajamentoScore']([{}], undefined);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('calcularHistoricoScore', () => {
    it('should return 50 when ultimoScore is undefined', () => {
      const result = service['calcularHistoricoScore'](undefined);
      expect(result).toBe(50);
    });

    it('should return 100 when ultimoScore is 100', () => {
      const result = service['calcularHistoricoScore'](100);
      expect(result).toBe(100);
    });

    it('should return 75 when ultimoScore is 50', () => {
      const result = service['calcularHistoricoScore'](50);
      expect(result).toBe(75);
    });

    it('should range from 50-100 based on previous score', () => {
      const result1 = service['calcularHistoricoScore'](0);
      const result2 = service['calcularHistoricoScore'](50);
      const result3 = service['calcularHistoricoScore'](100);

      expect(result1).toBe(50);
      expect(result2).toBeGreaterThan(result1);
      expect(result3).toBeGreaterThan(result2);
      expect(result3).toBe(100);
    });
  });

  describe('calcularScoreFinal', () => {
    it('should calculate weighted final score correctly', () => {
      const fatores = {
        fonteScore: 100,
        tipoObraScore: 100,
        segmentoScore: 100,
        engajamentoScore: 100,
        historicoScore: 100,
      };

      const result = service['calcularScoreFinal'](fatores);
      expect(result).toBe(100);
    });

    it('should apply correct weights', () => {
      const fatores = {
        fonteScore: 100, // 25%
        engajamentoScore: 100, // 25%
        segmentoScore: 100, // 20%
        tipoObraScore: 100, // 20%
        historicoScore: 100, // 10%
      };

      const result = service['calcularScoreFinal'](fatores);
      const expected = 100 * 0.25 + 100 * 0.25 + 100 * 0.2 + 100 * 0.2 + 100 * 0.1;
      expect(result).toBe(Math.round(expected));
    });

    it('should handle mixed scores', () => {
      const fatores = {
        fonteScore: 80,
        tipoObraScore: 70,
        segmentoScore: 60,
        engajamentoScore: 90,
        historicoScore: 75,
      };

      const result = service['calcularScoreFinal'](fatores);
      const expected =
        80 * 0.25 + 90 * 0.25 + 60 * 0.2 + 70 * 0.2 + 75 * 0.1;

      expect(result).toBe(Math.round(expected));
    });
  });

  describe('calcularProbabilidade', () => {
    it('should return ~0.5 for score 50 (sigmoid midpoint)', () => {
      const result = service['calcularProbabilidade'](50);
      expect(result).toBeGreaterThan(0.4);
      expect(result).toBeLessThan(0.6);
    });

    it('should return higher probability for higher scores', () => {
      const low = service['calcularProbabilidade'](30);
      const high = service['calcularProbabilidade'](70);
      expect(high).toBeGreaterThan(low);
    });

    it('should cap at 0.95 to prevent overconfidence', () => {
      const result = service['calcularProbabilidade'](100);
      expect(result).toBeLessThanOrEqual(0.95);
    });

    it('should return very low probability for score 0', () => {
      const result = service['calcularProbabilidade'](0);
      expect(result).toBeLessThan(0.1);
    });

    it('should follow sigmoid curve (slow rise, acceleration, plateau)', () => {
      const p20 = service['calcularProbabilidade'](20);
      const p50 = service['calcularProbabilidade'](50);
      const p80 = service['calcularProbabilidade'](80);

      expect(p50 - p20).toBeGreaterThan(p20);
      expect(p80 - p50).toBeLessThan(p50 - p20);
    });
  });

  describe('estimarDataClosing', () => {
    it('should return 15 days for probability > 0.8', () => {
      const result = service['estimarDataClosing'](0.85);
      const expected = new Date();
      expected.setDate(expected.getDate() + 15);

      expect(result.getDate()).toBe(expected.getDate());
    });

    it('should return 20 days for probability 0.6-0.8', () => {
      const result = service['estimarDataClosing'](0.7);
      const expected = new Date();
      expected.setDate(expected.getDate() + 20);

      expect(result.getDate()).toBe(expected.getDate());
    });

    it('should return 30 days for probability 0.4-0.6', () => {
      const result = service['estimarDataClosing'](0.5);
      const expected = new Date();
      expected.setDate(expected.getDate() + 30);

      expect(result.getDate()).toBe(expected.getDate());
    });

    it('should return 60 days for probability 0.2-0.4', () => {
      const result = service['estimarDataClosing'](0.3);
      const expected = new Date();
      expected.setDate(expected.getDate() + 60);

      expect(result.getDate()).toBe(expected.getDate());
    });

    it('should return 90 days for probability < 0.2', () => {
      const result = service['estimarDataClosing'](0.1);
      const expected = new Date();
      expected.setDate(expected.getDate() + 90);

      expect(result.getDate()).toBe(expected.getDate());
    });
  });
});
