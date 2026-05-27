import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CreditoService } from './credito.service';
import { PrismaService } from '../prisma/prisma.service';
import * as creditoUtils from '@imbobi/core';

// Mock @imbobi/core
jest.mock('@imbobi/core', () => ({
  simularCredito: jest.fn(),
}));

describe('CreditoService', () => {
  let service: CreditoService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    credito: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CreditoService>(CreditoService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('simular - Credit Simulation', () => {
    it('should simulate credit with basic parameters', () => {
      const mockResult = {
        parcelaMensal: 4512.34,
        totalPago: 54148.08,
        totalJuros: 4148.08,
        cet: 12.5,
      };
      (creditoUtils.simularCredito as jest.Mock).mockReturnValue(mockResult);

      const result = service.simular({
        valorSolicitado: 50000,
        prazoMeses: 12,
      });

      expect(result).toEqual(mockResult);
      expect(creditoUtils.simularCredito).toHaveBeenCalledWith(50000, 0.0099, 12);
    });

    it('should calculate correct monthly rate (0.99%)', () => {
      const mockResult = {
        parcelaMensal: 8754.32,
        totalPago: 105051.84,
        totalJuros: 5051.84,
        cet: 12.2,
      };
      (creditoUtils.simularCredito as jest.Mock).mockReturnValue(mockResult);

      service.simular({
        valorSolicitado: 100000,
        prazoMeses: 12,
      });

      expect(creditoUtils.simularCredito).toHaveBeenCalledWith(100000, 0.0099, 12);
    });

    it('should simulate credit for 24-month term', () => {
      const mockResult = {
        parcelaMensal: 4450.25,
        totalPago: 106806,
        totalJuros: 6806,
        cet: 12.8,
      };
      (creditoUtils.simularCredito as jest.Mock).mockReturnValue(mockResult);

      service.simular({
        valorSolicitado: 100000,
        prazoMeses: 24,
      });

      expect(creditoUtils.simularCredito).toHaveBeenCalledWith(100000, 0.0099, 24);
    });

    it('should simulate credit for 36-month term', () => {
      const mockResult = {
        parcelaMensal: 3083.54,
        totalPago: 111007.44,
        totalJuros: 11007.44,
        cet: 13.1,
      };
      (creditoUtils.simularCredito as jest.Mock).mockReturnValue(mockResult);

      service.simular({
        valorSolicitado: 100000,
        prazoMeses: 36,
      });

      expect(creditoUtils.simularCredito).toHaveBeenCalledWith(100000, 0.0099, 36);
    });

    it('should handle small loan amounts', () => {
      const mockResult = {
        parcelaMensal: 451.23,
        totalPago: 5414.76,
        totalJuros: 414.76,
        cet: 12.5,
      };
      (creditoUtils.simularCredito as jest.Mock).mockReturnValue(mockResult);

      service.simular({
        valorSolicitado: 5000,
        prazoMeses: 12,
      });

      expect(creditoUtils.simularCredito).toHaveBeenCalledWith(5000, 0.0099, 12);
    });

    it('should handle large loan amounts', () => {
      const mockResult = {
        parcelaMensal: 87543.21,
        totalPago: 1050518.52,
        totalJuros: 50518.52,
        cet: 12.5,
      };
      (creditoUtils.simularCredito as jest.Mock).mockReturnValue(mockResult);

      service.simular({
        valorSolicitado: 1000000,
        prazoMeses: 12,
      });

      expect(creditoUtils.simularCredito).toHaveBeenCalledWith(1000000, 0.0099, 12);
    });

    it('should return installment value in result', () => {
      const mockResult = {
        parcelaMensal: 4512.34,
        totalPago: 54148.08,
        totalJuros: 4148.08,
        cet: 12.5,
      };
      (creditoUtils.simularCredito as jest.Mock).mockReturnValue(mockResult);

      const result = service.simular({
        valorSolicitado: 50000,
        prazoMeses: 12,
      });

      expect(result).toHaveProperty('parcelaMensal');
      expect(result.parcelaMensal).toBeGreaterThan(0);
    });

    it('should return total cost in result', () => {
      const mockResult = {
        parcelaMensal: 4512.34,
        totalPago: 54148.08,
        totalJuros: 4148.08,
        cet: 12.5,
      };
      (creditoUtils.simularCredito as jest.Mock).mockReturnValue(mockResult);

      const result = service.simular({
        valorSolicitado: 50000,
        prazoMeses: 12,
      });

      expect(result).toHaveProperty('totalPago');
      expect(result.totalPago).toBeGreaterThanOrEqual(result.parcelaMensal);
    });

    it('should return interest amount in result', () => {
      const mockResult = {
        parcelaMensal: 4512.34,
        totalPago: 54148.08,
        totalJuros: 4148.08,
        cet: 12.5,
      };
      (creditoUtils.simularCredito as jest.Mock).mockReturnValue(mockResult);

      const result = service.simular({
        valorSolicitado: 50000,
        prazoMeses: 12,
      });

      expect(result).toHaveProperty('totalJuros');
      expect(result.totalJuros).toBeGreaterThan(0);
    });
  });

  describe('solicitar - Request Credit', () => {
    it('should create credit request successfully', async () => {
      const usuarioId = 'user-123';
      const input = { valorSolicitado: 50000, prazoMeses: 12 };
      const mockCredit = {
        creditoId: 'credit-123',
        usuarioId,
        valorAprovado: 50000,
        valorLiberado: 0,
        taxaMensal: 0.0099,
        prazoMeses: 12,
        status: 'ATIVO',
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      prisma.credito.create.mockResolvedValue(mockCredit);

      const result = await service.solicitar(usuarioId, input);

      expect(result).toEqual(mockCredit);
      expect(prisma.credito.create).toHaveBeenCalledWith({
        data: {
          usuarioId,
          valorAprovado: 50000,
          valorLiberado: 0,
          taxaMensal: 0.0099,
          prazoMeses: 12,
        },
      });
    });

    it('should set approved value equal to requested value', async () => {
      const usuarioId = 'user-123';
      const valorSolicitado = 75000;
      const input = { valorSolicitado, prazoMeses: 24 };
      const mockCredit = {
        creditoId: 'credit-123',
        usuarioId,
        valorAprovado: valorSolicitado,
        valorLiberado: 0,
        taxaMensal: 0.0099,
        prazoMeses: 24,
        status: 'ATIVO',
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      prisma.credito.create.mockResolvedValue(mockCredit);

      const result = await service.solicitar(usuarioId, input);

      expect(result.valorAprovado).toBe(valorSolicitado);
    });

    it('should initialize valor liberado as 0', async () => {
      const usuarioId = 'user-123';
      const input = { valorSolicitado: 50000, prazoMeses: 12 };
      const mockCredit = {
        creditoId: 'credit-123',
        usuarioId,
        valorAprovado: 50000,
        valorLiberado: 0,
        taxaMensal: 0.0099,
        prazoMeses: 12,
        status: 'ATIVO',
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      prisma.credito.create.mockResolvedValue(mockCredit);

      const result = await service.solicitar(usuarioId, input);

      expect(result.valorLiberado).toBe(0);
    });

    it('should apply standard monthly rate (0.99%)', async () => {
      const usuarioId = 'user-123';
      const input = { valorSolicitado: 50000, prazoMeses: 12 };
      const mockCredit = {
        creditoId: 'credit-123',
        usuarioId,
        valorAprovado: 50000,
        valorLiberado: 0,
        taxaMensal: 0.0099,
        prazoMeses: 12,
        status: 'ATIVO',
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      prisma.credito.create.mockResolvedValue(mockCredit);

      const result = await service.solicitar(usuarioId, input);

      expect(result.taxaMensal).toBe(0.0099);
    });

    it('should preserve prazo meses from request', async () => {
      const usuarioId = 'user-123';
      const prazoMeses = 24;
      const input = { valorSolicitado: 50000, prazoMeses };
      const mockCredit = {
        creditoId: 'credit-123',
        usuarioId,
        valorAprovado: 50000,
        valorLiberado: 0,
        taxaMensal: 0.0099,
        prazoMeses,
        status: 'ATIVO',
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      prisma.credito.create.mockResolvedValue(mockCredit);

      const result = await service.solicitar(usuarioId, input);

      expect(result.prazoMeses).toBe(prazoMeses);
    });

    it('should return created credit with creditoId', async () => {
      const usuarioId = 'user-123';
      const input = { valorSolicitado: 50000, prazoMeses: 12 };
      const mockCredit = {
        creditoId: 'credit-123',
        usuarioId,
        valorAprovado: 50000,
        valorLiberado: 0,
        taxaMensal: 0.0099,
        prazoMeses: 12,
        status: 'ATIVO',
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      prisma.credito.create.mockResolvedValue(mockCredit);

      const result = await service.solicitar(usuarioId, input);

      expect(result).toHaveProperty('creditoId');
      expect(result.creditoId).toBe('credit-123');
    });
  });

  describe('buscarPorUsuario - Fetch User Credits', () => {
    it('should return credits for user with relations', async () => {
      const usuarioId = 'user-123';
      const mockCredits = [
        {
          creditoId: 'credit-1',
          usuarioId,
          valorAprovado: 50000,
          valorLiberado: 25000,
          taxaMensal: 0.0099,
          prazoMeses: 12,
          status: 'ATIVO',
          criadoEm: new Date('2024-01-01'),
          atualizadoEm: new Date(),
          obras: [{ obraId: 'obra-1', nome: 'Casa A', status: 'EM_CONSTRUCAO' }],
          liberacoes: [
            { liberacaoId: 'lib-1', valor: 25000, status: 'PROCESSADO', processadoEm: new Date() },
          ],
        },
      ];

      prisma.credito.findMany.mockResolvedValue(mockCredits);

      const result = await service.buscarPorUsuario(usuarioId);

      expect(result).toEqual(mockCredits);
      expect(prisma.credito.findMany).toHaveBeenCalledWith({
        where: { usuarioId },
        include: {
          obras: { select: { obraId: true, nome: true, status: true } },
          liberacoes: {
            select: { liberacaoId: true, valor: true, status: true, processadoEm: true },
            orderBy: { criadoEm: 'desc' },
            take: 10,
          },
        },
        orderBy: { criadoEm: 'desc' },
      });
    });

    it('should return empty array for user with no credits', async () => {
      const usuarioId = 'user-123';
      prisma.credito.findMany.mockResolvedValue([]);

      const result = await service.buscarPorUsuario(usuarioId);

      expect(result).toEqual([]);
    });

    it('should order credits by creation date descending', async () => {
      const usuarioId = 'user-123';
      prisma.credito.findMany.mockResolvedValue([]);

      await service.buscarPorUsuario(usuarioId);

      const callArgs = prisma.credito.findMany.mock.calls[0][0];
      expect(callArgs?.orderBy).toEqual({ criadoEm: 'desc' });
    });

    it('should include obras relation', async () => {
      const usuarioId = 'user-123';
      prisma.credito.findMany.mockResolvedValue([]);

      await service.buscarPorUsuario(usuarioId);

      const callArgs = prisma.credito.findMany.mock.calls[0][0];
      expect(callArgs?.include).toHaveProperty('obras');
    });

    it('should include liberacoes with limit of 10', async () => {
      const usuarioId = 'user-123';
      prisma.credito.findMany.mockResolvedValue([]);

      await service.buscarPorUsuario(usuarioId);

      const callArgs = prisma.credito.findMany.mock.calls[0][0];
      expect(callArgs?.include?.liberacoes).toHaveProperty('take', 10);
    });

    it('should return multiple credits for user', async () => {
      const usuarioId = 'user-123';
      const mockCredits = [
        {
          creditoId: 'credit-1',
          usuarioId,
          valorAprovado: 50000,
          valorLiberado: 25000,
          taxaMensal: 0.0099,
          prazoMeses: 12,
          status: 'ATIVO',
          criadoEm: new Date('2024-02-01'),
          atualizadoEm: new Date(),
          obras: [],
          liberacoes: [],
        },
        {
          creditoId: 'credit-2',
          usuarioId,
          valorAprovado: 100000,
          valorLiberado: 50000,
          taxaMensal: 0.0099,
          prazoMeses: 24,
          status: 'ATIVO',
          criadoEm: new Date('2024-01-01'),
          atualizadoEm: new Date(),
          obras: [],
          liberacoes: [],
        },
      ];

      prisma.credito.findMany.mockResolvedValue(mockCredits);

      const result = await service.buscarPorUsuario(usuarioId);

      expect(result).toHaveLength(2);
    });
  });

  describe('extrato - Get Credit Statement', () => {
    it('should return credit statement with liberacoes', async () => {
      const creditoId = 'credit-123';
      const mockStatement = {
        creditoId,
        usuarioId: 'user-123',
        valorAprovado: 50000,
        valorLiberado: 25000,
        taxaMensal: 0.0099,
        prazoMeses: 12,
        status: 'ATIVO',
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        liberacoes: [
          {
            liberacaoId: 'lib-1',
            valor: 25000,
            status: 'PROCESSADO',
            processadoEm: new Date(),
            criadoEm: new Date(),
            creditoId,
          },
        ],
      };

      prisma.credito.findUnique.mockResolvedValue(mockStatement);

      const result = await service.extrato(creditoId);

      expect(result).toEqual(mockStatement);
      expect(prisma.credito.findUnique).toHaveBeenCalledWith({
        where: { creditoId },
        include: { liberacoes: { orderBy: { criadoEm: 'desc' } } },
      });
    });

    it('should throw NotFoundException when credit not found', async () => {
      const creditoId = 'invalid-credit-id';
      prisma.credito.findUnique.mockResolvedValue(null);

      await expect(service.extrato(creditoId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message', async () => {
      const creditoId = 'invalid-credit-id';
      prisma.credito.findUnique.mockResolvedValue(null);

      await expect(service.extrato(creditoId)).rejects.toThrow(
        'Crédito não encontrado.'
      );
    });

    it('should order liberacoes by date descending', async () => {
      const creditoId = 'credit-123';
      const mockStatement = {
        creditoId,
        usuarioId: 'user-123',
        valorAprovado: 50000,
        valorLiberado: 50000,
        taxaMensal: 0.0099,
        prazoMeses: 12,
        status: 'ATIVO',
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        liberacoes: [],
      };

      prisma.credito.findUnique.mockResolvedValue(mockStatement);

      await service.extrato(creditoId);

      const callArgs = prisma.credito.findUnique.mock.calls[0][0];
      expect(callArgs?.include?.liberacoes).toEqual({ orderBy: { criadoEm: 'desc' } });
    });

    it('should return credit with all fields', async () => {
      const creditoId = 'credit-123';
      const mockStatement = {
        creditoId,
        usuarioId: 'user-123',
        valorAprovado: 50000,
        valorLiberado: 25000,
        taxaMensal: 0.0099,
        prazoMeses: 12,
        status: 'ATIVO',
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        liberacoes: [],
      };

      prisma.credito.findUnique.mockResolvedValue(mockStatement);

      const result = await service.extrato(creditoId);

      expect(result).toHaveProperty('creditoId');
      expect(result).toHaveProperty('usuarioId');
      expect(result).toHaveProperty('valorAprovado');
      expect(result).toHaveProperty('liberacoes');
    });

    it('should handle credit with multiple liberacoes', async () => {
      const creditoId = 'credit-123';
      const mockStatement = {
        creditoId,
        usuarioId: 'user-123',
        valorAprovado: 100000,
        valorLiberado: 100000,
        taxaMensal: 0.0099,
        prazoMeses: 24,
        status: 'QUITADO',
        criadoEm: new Date('2024-01-01'),
        atualizadoEm: new Date(),
        liberacoes: [
          {
            liberacaoId: 'lib-1',
            valor: 50000,
            status: 'PROCESSADO',
            processadoEm: new Date('2024-01-15'),
            criadoEm: new Date('2024-01-15'),
            creditoId,
          },
          {
            liberacaoId: 'lib-2',
            valor: 50000,
            status: 'PROCESSADO',
            processadoEm: new Date('2024-02-15'),
            criadoEm: new Date('2024-02-15'),
            creditoId,
          },
        ],
      };

      prisma.credito.findUnique.mockResolvedValue(mockStatement);

      const result = await service.extrato(creditoId);

      expect(result.liberacoes).toHaveLength(2);
    });

    it('should handle credit with no liberacoes', async () => {
      const creditoId = 'credit-123';
      const mockStatement = {
        creditoId,
        usuarioId: 'user-123',
        valorAprovado: 50000,
        valorLiberado: 0,
        taxaMensal: 0.0099,
        prazoMeses: 12,
        status: 'ATIVO',
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        liberacoes: [],
      };

      prisma.credito.findUnique.mockResolvedValue(mockStatement);

      const result = await service.extrato(creditoId);

      expect(result.liberacoes).toEqual([]);
      expect(result.valorLiberado).toBe(0);
    });
  });
});
