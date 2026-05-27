import { Test, TestingModule } from '@nestjs/testing';
import { ScoreService } from './score.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ScoreService', () => {
  let service: ScoreService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    obra: {
      findMany: jest.fn(),
    },
    credito: {
      findMany: jest.fn(),
    },
    usuario: {
      findUnique: jest.fn(),
    },
    scoreHistorico: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ScoreService>(ScoreService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('calcularScore - Calculate Constructability Score (0-1000)', () => {
    it('should return base score of 600 for new user with no works', async () => {
      const usuarioId = 'user-123';

      prisma.obra.findMany.mockResolvedValue([]);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: new Date(),
        kycStatus: 'NAO_INICIADO',
      } as any);

      const score = await service.calcularScore(usuarioId);

      expect(score).toBe(600);
    });

    it('should add points for completed works', async () => {
      const usuarioId = 'user-123';

      prisma.obra.findMany.mockResolvedValue([
        { status: 'CONCLUIDA', usuarioId, obraId: '1' } as any,
        { status: 'CONCLUIDA', usuarioId, obraId: '2' } as any,
        { status: 'EM_CONSTRUCAO', usuarioId, obraId: '3' } as any,
      ]);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: new Date(),
        kycStatus: 'NAO_INICIADO',
      } as any);

      const score = await service.calcularScore(usuarioId);

      expect(score).toBeGreaterThan(600);
    });

    it('should cap completed works bonus at 200 points', async () => {
      const usuarioId = 'user-123';

      const obras = Array.from({ length: 10 }, (_, i) => ({
        status: 'CONCLUIDA',
        usuarioId,
        obraId: `${i}`,
      }));

      prisma.obra.findMany.mockResolvedValue(obras as any);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: new Date(),
        kycStatus: 'NAO_INICIADO',
      } as any);

      const score = await service.calcularScore(usuarioId);

      // Base 600 + 200 (works) + 300 (completion rate 100%) = 1100, capped at 1000
      expect(score).toBeLessThanOrEqual(1000);
    });

    it('should calculate completion rate (0-300 points)', async () => {
      const usuarioId = 'user-123';

      prisma.obra.findMany.mockResolvedValue([
        { status: 'CONCLUIDA', usuarioId, obraId: '1' } as any,
        { status: 'CONCLUIDA', usuarioId, obraId: '2' } as any,
        { status: 'EM_CONSTRUCAO', usuarioId, obraId: '3' } as any,
      ]);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: new Date(),
        kycStatus: 'NAO_INICIADO',
      } as any);

      const score = await service.calcularScore(usuarioId);

      const expectedCompletion = Math.round((2 / 3) * 300);
      expect(score).toBeGreaterThanOrEqual(600 + expectedCompletion);
    });

    it('should award 0 points for completion rate when no works', async () => {
      const usuarioId = 'user-123';

      prisma.obra.findMany.mockResolvedValue([]);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: new Date(),
        kycStatus: 'NAO_INICIADO',
      } as any);

      const score = await service.calcularScore(usuarioId);

      expect(score).toBe(600);
    });

    it('should add points for on-time credits (ATIVO or QUITADO)', async () => {
      const usuarioId = 'user-123';

      prisma.obra.findMany.mockResolvedValue([]);
      prisma.credito.findMany.mockResolvedValue([
        { status: 'ATIVO', usuarioId } as any,
        { status: 'QUITADO', usuarioId } as any,
      ]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: new Date(),
        kycStatus: 'NAO_INICIADO',
      } as any);

      const score = await service.calcularScore(usuarioId);

      expect(score).toBeGreaterThan(600);
    });

    it('should cap credit bonus at 200 points', async () => {
      const usuarioId = 'user-123';

      const creditos = Array.from({ length: 10 }, (_, i) => ({
        status: 'ATIVO',
        usuarioId,
      }));

      prisma.obra.findMany.mockResolvedValue([]);
      prisma.credito.findMany.mockResolvedValue(creditos as any);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: new Date(),
        kycStatus: 'NAO_INICIADO',
      } as any);

      const score = await service.calcularScore(usuarioId);

      expect(score).toBeLessThanOrEqual(800);
    });

    it('should add points for customer tenure (up to 100 points)', async () => {
      const usuarioId = 'user-123';
      const createdDate = new Date();
      createdDate.setMonth(createdDate.getMonth() - 24);

      prisma.obra.findMany.mockResolvedValue([]);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: createdDate,
        kycStatus: 'NAO_INICIADO',
      } as any);

      const score = await service.calcularScore(usuarioId);

      expect(score).toBeGreaterThan(600);
    });

    it('should add 200 points for approved KYC', async () => {
      const usuarioId = 'user-123';

      prisma.obra.findMany.mockResolvedValue([]);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: new Date(),
        kycStatus: 'APROVADO',
      } as any);

      const score = await service.calcularScore(usuarioId);

      expect(score).toBe(800);
    });

    it('should not add KYC points for non-approved KYC', async () => {
      const usuarioId = 'user-123';

      prisma.obra.findMany.mockResolvedValue([]);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: new Date(),
        kycStatus: 'PENDENTE',
      } as any);

      const score = await service.calcularScore(usuarioId);

      expect(score).toBe(600);
    });

    it('should cap score at maximum of 1000 points', async () => {
      const usuarioId = 'user-123';
      const createdDate = new Date();
      createdDate.setMonth(createdDate.getMonth() - 60);

      const obras = Array.from({ length: 20 }, (_, i) => ({
        status: 'CONCLUIDA',
        usuarioId,
        obraId: `${i}`,
      }));

      const creditos = Array.from({ length: 10 }, (_, i) => ({
        status: 'QUITADO',
        usuarioId,
      }));

      prisma.obra.findMany.mockResolvedValue(obras as any);
      prisma.credito.findMany.mockResolvedValue(creditos as any);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: createdDate,
        kycStatus: 'APROVADO',
      } as any);

      const score = await service.calcularScore(usuarioId);

      expect(score).toBeLessThanOrEqual(1000);
    });

    it('should ensure score never goes below 0', async () => {
      const usuarioId = 'user-123';

      prisma.obra.findMany.mockResolvedValue([]);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.usuario.findUnique.mockResolvedValue(null);

      const score = await service.calcularScore(usuarioId);

      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should calculate score with all six factors combined', async () => {
      const usuarioId = 'user-123';
      const createdDate = new Date();
      createdDate.setMonth(createdDate.getMonth() - 12);

      prisma.obra.findMany.mockResolvedValue([
        { status: 'CONCLUIDA', usuarioId, obraId: '1' } as any,
        { status: 'CONCLUIDA', usuarioId, obraId: '2' } as any,
        { status: 'EM_CONSTRUCAO', usuarioId, obraId: '3' } as any,
      ]);
      prisma.credito.findMany.mockResolvedValue([
        { status: 'ATIVO', usuarioId } as any,
        { status: 'QUITADO', usuarioId } as any,
      ]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: createdDate,
        kycStatus: 'APROVADO',
      } as any);

      const score = await service.calcularScore(usuarioId);

      expect(score).toBeGreaterThan(600);
      expect(score).toBeLessThanOrEqual(1000);
    });

    it('should return numeric score value', async () => {
      const usuarioId = 'user-123';

      prisma.obra.findMany.mockResolvedValue([]);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: new Date(),
        kycStatus: 'NAO_INICIADO',
      } as any);

      const score = await service.calcularScore(usuarioId);

      expect(typeof score).toBe('number');
      expect(Number.isInteger(score)).toBe(true);
    });
  });

  describe('buscarScoreAtual - Get Current Score and Record History', () => {
    it('should calculate and return current score', async () => {
      const usuarioId = 'user-123';

      prisma.obra.findMany.mockResolvedValue([]);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: new Date(),
        kycStatus: 'NAO_INICIADO',
      } as any);
      prisma.scoreHistorico.create.mockResolvedValue({
        historicoId: 'hist-1',
        usuarioId,
        score: 600,
        motivo: 'Cálculo automático',
        criadoEm: new Date(),
      } as any);

      const score = await service.buscarScoreAtual(usuarioId);

      expect(score).toBe(600);
    });

    it('should record score in history with automatic calculation reason', async () => {
      const usuarioId = 'user-123';

      prisma.obra.findMany.mockResolvedValue([]);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: new Date(),
        kycStatus: 'NAO_INICIADO',
      } as any);
      prisma.scoreHistorico.create.mockResolvedValue({
        historicoId: 'hist-1',
        usuarioId,
        score: 600,
        motivo: 'Cálculo automático',
        criadoEm: new Date(),
      } as any);

      await service.buscarScoreAtual(usuarioId);

      expect(prisma.scoreHistorico.create).toHaveBeenCalledWith({
        data: {
          usuarioId,
          score: 600,
          motivo: 'Cálculo automático',
        },
      });
    });

    it('should always create history entry', async () => {
      const usuarioId = 'user-123';

      prisma.obra.findMany.mockResolvedValue([]);
      prisma.credito.findMany.mockResolvedValue([]);
      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        criadoEm: new Date(),
        kycStatus: 'APROVADO',
      } as any);
      prisma.scoreHistorico.create.mockResolvedValue({
        historicoId: 'hist-1',
        usuarioId,
        score: 800,
        motivo: 'Cálculo automático',
        criadoEm: new Date(),
      } as any);

      await service.buscarScoreAtual(usuarioId);

      expect(prisma.scoreHistorico.create).toHaveBeenCalled();
    });
  });

  describe('buscarHistorico - Get Score History', () => {
    it('should return score history for user', async () => {
      const usuarioId = 'user-123';
      const mockHistory = [
        { historicoId: 'h1', usuarioId, score: 600, motivo: 'Cálculo automático', criadoEm: new Date() },
        { historicoId: 'h2', usuarioId, score: 650, motivo: 'Cálculo automático', criadoEm: new Date() },
      ];

      prisma.scoreHistorico.findMany.mockResolvedValue(mockHistory as any);

      const result = await service.buscarHistorico(usuarioId);

      expect(result).toEqual(mockHistory);
    });

    it('should order history by date descending', async () => {
      const usuarioId = 'user-123';

      prisma.scoreHistorico.findMany.mockResolvedValue([]);

      await service.buscarHistorico(usuarioId);

      const callArgs = prisma.scoreHistorico.findMany.mock.calls[0][0];
      expect(callArgs?.orderBy).toEqual({ criadoEm: 'desc' });
    });

    it('should default to limit of 12 records', async () => {
      const usuarioId = 'user-123';

      prisma.scoreHistorico.findMany.mockResolvedValue([]);

      await service.buscarHistorico(usuarioId);

      const callArgs = prisma.scoreHistorico.findMany.mock.calls[0][0];
      expect(callArgs?.take).toBe(12);
    });

    it('should accept custom limit parameter', async () => {
      const usuarioId = 'user-123';
      const customLimit = 20;

      prisma.scoreHistorico.findMany.mockResolvedValue([]);

      await service.buscarHistorico(usuarioId, customLimit);

      const callArgs = prisma.scoreHistorico.findMany.mock.calls[0][0];
      expect(callArgs?.take).toBe(customLimit);
    });

    it('should return empty array when no history exists', async () => {
      const usuarioId = 'user-123';

      prisma.scoreHistorico.findMany.mockResolvedValue([]);

      const result = await service.buscarHistorico(usuarioId);

      expect(result).toEqual([]);
    });

    it('should return multiple history entries', async () => {
      const usuarioId = 'user-123';
      const mockHistory = Array.from({ length: 5 }, (_, i) => ({
        historicoId: `h${i}`,
        usuarioId,
        score: 600 + i * 10,
        motivo: 'Cálculo automático',
        criadoEm: new Date(),
      }));

      prisma.scoreHistorico.findMany.mockResolvedValue(mockHistory as any);

      const result = await service.buscarHistorico(usuarioId);

      expect(result).toHaveLength(5);
    });
  });

  describe('obterNivel - Get Score Level and Description', () => {
    it('should return "Excelente" level for score 800+', () => {
      const result = service.obterNivel(800);

      expect(result.nivel).toBe('Excelente');
      expect(result.cor).toBe('text-green-600');
    });

    it('should return "Bom" level for score 650-799', () => {
      const result = service.obterNivel(700);

      expect(result.nivel).toBe('Bom');
      expect(result.cor).toBe('text-blue-600');
    });

    it('should return "Regular" level for score 450-649', () => {
      const result = service.obterNivel(550);

      expect(result.nivel).toBe('Regular');
      expect(result.cor).toBe('text-yellow-600');
    });

    it('should return "Iniciante" level for score below 450', () => {
      const result = service.obterNivel(400);

      expect(result.nivel).toBe('Iniciante');
      expect(result.cor).toBe('text-gray-600');
    });

    it('should return description for Excelente level', () => {
      const result = service.obterNivel(850);

      expect(result.descricao).toContain('impecável');
    });

    it('should return description for Bom level', () => {
      const result = service.obterNivel(700);

      expect(result.descricao).toContain('Histórico');
    });

    it('should return description for Regular level', () => {
      const result = service.obterNivel(500);

      expect(result.descricao).toContain('construção');
    });

    it('should return description for Iniciante level', () => {
      const result = service.obterNivel(300);

      expect(result.descricao).toContain('Primeiras');
    });

    it('should return object with all required properties', () => {
      const result = service.obterNivel(650);

      expect(result).toHaveProperty('nivel');
      expect(result).toHaveProperty('cor');
      expect(result).toHaveProperty('descricao');
    });

    it('should handle boundary score of 800', () => {
      const result = service.obterNivel(800);

      expect(result.nivel).toBe('Excelente');
    });

    it('should handle boundary score of 650', () => {
      const result = service.obterNivel(650);

      expect(result.nivel).toBe('Bom');
    });

    it('should handle boundary score of 450', () => {
      const result = service.obterNivel(450);

      expect(result.nivel).toBe('Regular');
    });

    it('should handle maximum score of 1000', () => {
      const result = service.obterNivel(1000);

      expect(result.nivel).toBe('Excelente');
    });

    it('should handle minimum score of 0', () => {
      const result = service.obterNivel(0);

      expect(result.nivel).toBe('Iniciante');
    });
  });
});
