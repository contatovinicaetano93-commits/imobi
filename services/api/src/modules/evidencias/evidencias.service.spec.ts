import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EvidenciasService } from './evidencias.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as coreUtils from '@imbobi/core';

jest.mock('@imbobi/core', () => ({
  calcularDistanciaMetros: jest.fn(),
}));

describe('EvidenciasService', () => {
  let service: EvidenciasService;
  let prisma: jest.Mocked<PrismaService>;
  let storage: jest.Mocked<StorageService>;

  const mockPrismaService = {
    etapaObra: {
      findUnique: jest.fn(),
    },
    evidenciaEtapa: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockStorageService = {
    upload: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mock objects
    mockPrismaService.etapaObra.findUnique = jest.fn();
    mockPrismaService.evidenciaEtapa.create = jest.fn();
    mockPrismaService.evidenciaEtapa.findMany = jest.fn();
    mockPrismaService.evidenciaEtapa.update = jest.fn();
    mockPrismaService.$queryRaw = jest.fn();
    mockStorageService.upload = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenciasService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<EvidenciasService>(EvidenciasService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    storage = module.get(StorageService) as jest.Mocked<StorageService>;
  });

  describe('upload - Upload Evidence with GPS Validation', () => {
    const mockObraData = {
      obraId: 'obra-123',
      geoLatitude: -23.5505,
      geoLongitude: -46.6333,
      raioValidacaoMetros: 50,
      usuarioId: 'user-123',
    };

    const validInput = {
      etapaId: 'etapa-123',
      latitude: -23.5505,
      longitude: -46.6333,
      accuracyMetros: 10,
      descricao: 'Fundações concluídas',
    };

    it('should upload evidence successfully within valid range', async () => {
      const usuarioId = 'user-123';
      const fileBuffer = Buffer.from('image-data');
      const mimeType = 'image/jpeg';

      prisma.etapaObra.findUnique.mockResolvedValue({
        etapaId: validInput.etapaId,
        obra: mockObraData,
      } as any);

      prisma.$queryRaw.mockResolvedValue([{ dentro: true }]);

      (coreUtils.calcularDistanciaMetros as jest.Mock).mockReturnValue(15);

      mockStorageService.upload.mockResolvedValue({
        url: 'https://s3.amazonaws.com/evidence-123.jpg',
      } as any);

      prisma.evidenciaEtapa.create.mockResolvedValue({
        evidenciaId: 'evid-123',
        etapaId: validInput.etapaId,
        obraId: 'obra-123',
        fotoUrl: 'https://s3.amazonaws.com/evidence-123.jpg',
        latCaptura: validInput.latitude,
        lngCaptura: validInput.longitude,
        accuracyMetros: validInput.accuracyMetros,
        distanciaObra: 15,
        observacao: validInput.descricao,
      } as any);

      const result = await service.upload(
        usuarioId,
        validInput,
        fileBuffer,
        mimeType
      );

      expect(result).toHaveProperty('evidenciaId');
      expect(prisma.evidenciaEtapa.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when etapa not found', async () => {
      const usuarioId = 'user-123';
      const fileBuffer = Buffer.from('image-data');

      prisma.etapaObra.findUnique.mockResolvedValue(null);

      await expect(
        service.upload(usuarioId, validInput, fileBuffer, 'image/jpeg')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not owner of obra', async () => {
      const usuarioId = 'different-user';
      const fileBuffer = Buffer.from('image-data');

      prisma.etapaObra.findUnique.mockResolvedValue({
        etapaId: validInput.etapaId,
        obra: {
          ...mockObraData,
          usuarioId: 'owner-user',
        },
      } as any);

      await expect(
        service.upload(usuarioId, validInput, fileBuffer, 'image/jpeg')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should validate GPS accuracy is within 15 meters', async () => {
      const usuarioId = 'user-123';
      const fileBuffer = Buffer.from('image-data');
      const invalidInput = { ...validInput, accuracyMetros: 20 };

      prisma.etapaObra.findUnique.mockResolvedValue({
        etapaId: invalidInput.etapaId,
        obra: mockObraData,
      } as any);

      await expect(
        service.upload(usuarioId, invalidInput, fileBuffer, 'image/jpeg')
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject GPS accuracy of 16 meters', async () => {
      const usuarioId = 'user-123';
      const fileBuffer = Buffer.from('image-data');
      const invalidInput = { ...validInput, accuracyMetros: 16 };

      prisma.etapaObra.findUnique.mockResolvedValue({
        etapaId: invalidInput.etapaId,
        obra: mockObraData,
      } as any);

      await expect(
        service.upload(usuarioId, invalidInput, fileBuffer, 'image/jpeg')
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept GPS accuracy of 15 meters', async () => {
      const usuarioId = 'user-123';
      const fileBuffer = Buffer.from('image-data');
      const input = { ...validInput, accuracyMetros: 15 };

      prisma.etapaObra.findUnique.mockResolvedValue({
        etapaId: input.etapaId,
        obra: mockObraData,
      } as any);

      prisma.$queryRaw.mockResolvedValue([{ dentro: true }]);
      (coreUtils.calcularDistanciaMetros as jest.Mock).mockReturnValue(10);
      mockStorageService.upload.mockResolvedValue({
        url: 'https://s3.amazonaws.com/evidence.jpg',
      } as any);

      prisma.evidenciaEtapa.create.mockResolvedValue({} as any);

      const result = await service.upload(
        usuarioId,
        input,
        fileBuffer,
        'image/jpeg'
      );

      expect(result).toBeDefined();
    });

    it('should validate location within work site radius using PostGIS', async () => {
      const usuarioId = 'user-123';
      const fileBuffer = Buffer.from('image-data');

      prisma.etapaObra.findUnique.mockResolvedValue({
        etapaId: validInput.etapaId,
        obra: mockObraData,
      } as any);

      prisma.$queryRaw.mockResolvedValue([{ dentro: false }]);
      (coreUtils.calcularDistanciaMetros as jest.Mock).mockReturnValue(100);

      await expect(
        service.upload(usuarioId, validInput, fileBuffer, 'image/jpeg')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should calculate distance to work site', async () => {
      const usuarioId = 'user-123';
      const fileBuffer = Buffer.from('image-data');

      prisma.etapaObra.findUnique.mockResolvedValue({
        etapaId: validInput.etapaId,
        obra: mockObraData,
      } as any);

      prisma.$queryRaw.mockResolvedValue([{ dentro: true }]);
      (coreUtils.calcularDistanciaMetros as jest.Mock).mockReturnValue(25);
      mockStorageService.upload.mockResolvedValue({
        url: 'https://s3.amazonaws.com/evidence.jpg',
      } as any);

      prisma.evidenciaEtapa.create.mockResolvedValue({
        distanciaObra: 25,
      } as any);

      await service.upload(usuarioId, validInput, fileBuffer, 'image/jpeg');

      expect(coreUtils.calcularDistanciaMetros).toHaveBeenCalledWith(
        { latitude: validInput.latitude, longitude: validInput.longitude },
        expect.objectContaining({
          latitude: mockObraData.geoLatitude,
          longitude: mockObraData.geoLongitude,
        })
      );
    });

    it('should upload file to storage service', async () => {
      const usuarioId = 'user-123';
      const fileBuffer = Buffer.from('image-data');
      const mimeType = 'image/jpeg';

      prisma.etapaObra.findUnique.mockResolvedValue({
        etapaId: validInput.etapaId,
        obra: mockObraData,
      } as any);

      prisma.$queryRaw.mockResolvedValue([{ dentro: true }]);
      (coreUtils.calcularDistanciaMetros as jest.Mock).mockReturnValue(10);
      mockStorageService.upload.mockResolvedValue({
        url: 'https://s3.amazonaws.com/evidence.jpg',
      } as any);

      prisma.evidenciaEtapa.create.mockResolvedValue({} as any);

      await service.upload(usuarioId, validInput, fileBuffer, mimeType);

      expect(mockStorageService.upload).toHaveBeenCalledWith(
        fileBuffer,
        mimeType,
        validInput.etapaId
      );
    });

    it('should store evidence with captured GPS coordinates', async () => {
      const usuarioId = 'user-123';
      const fileBuffer = Buffer.from('image-data');

      prisma.etapaObra.findUnique.mockResolvedValue({
        etapaId: validInput.etapaId,
        obra: mockObraData,
      } as any);

      prisma.$queryRaw.mockResolvedValue([{ dentro: true }]);
      (coreUtils.calcularDistanciaMetros as jest.Mock).mockReturnValue(10);
      mockStorageService.upload.mockResolvedValue({
        url: 'https://s3.amazonaws.com/evidence.jpg',
      } as any);

      prisma.evidenciaEtapa.create.mockResolvedValue({} as any);

      await service.upload(usuarioId, validInput, fileBuffer, 'image/jpeg');

      const createCall = prisma.evidenciaEtapa.create.mock.calls[0][0];
      expect(createCall.data.latCaptura).toBe(validInput.latitude);
      expect(createCall.data.lngCaptura).toBe(validInput.longitude);
    });

    it('should store GPS accuracy in evidence record', async () => {
      const usuarioId = 'user-123';
      const fileBuffer = Buffer.from('image-data');

      prisma.etapaObra.findUnique.mockResolvedValue({
        etapaId: validInput.etapaId,
        obra: mockObraData,
      } as any);

      prisma.$queryRaw.mockResolvedValue([{ dentro: true }]);
      (coreUtils.calcularDistanciaMetros as jest.Mock).mockReturnValue(10);
      mockStorageService.upload.mockResolvedValue({
        url: 'https://s3.amazonaws.com/evidence.jpg',
      } as any);

      prisma.evidenciaEtapa.create.mockResolvedValue({} as any);

      await service.upload(usuarioId, validInput, fileBuffer, 'image/jpeg');

      const createCall = prisma.evidenciaEtapa.create.mock.calls[0][0];
      expect(createCall.data.accuracyMetros).toBe(validInput.accuracyMetros);
    });

    it('should include description in evidence record', async () => {
      const usuarioId = 'user-123';
      const fileBuffer = Buffer.from('image-data');

      prisma.etapaObra.findUnique.mockResolvedValue({
        etapaId: validInput.etapaId,
        obra: mockObraData,
      } as any);

      prisma.$queryRaw.mockResolvedValue([{ dentro: true }]);
      (coreUtils.calcularDistanciaMetros as jest.Mock).mockReturnValue(10);
      mockStorageService.upload.mockResolvedValue({
        url: 'https://s3.amazonaws.com/evidence.jpg',
      } as any);

      prisma.evidenciaEtapa.create.mockResolvedValue({} as any);

      await service.upload(usuarioId, validInput, fileBuffer, 'image/jpeg');

      const createCall = prisma.evidenciaEtapa.create.mock.calls[0][0];
      expect(createCall.data.observacao).toBe(validInput.descricao);
    });

    it('should handle multiple evidences for same etapa', async () => {
      const usuarioId = 'user-123';
      const fileBuffer = Buffer.from('image-data');

      prisma.etapaObra.findUnique.mockResolvedValue({
        etapaId: validInput.etapaId,
        obra: mockObraData,
      } as any);

      prisma.$queryRaw.mockResolvedValue([{ dentro: true }]);
      (coreUtils.calcularDistanciaMetros as jest.Mock).mockReturnValue(10);
      mockStorageService.upload.mockResolvedValue({
        url: 'https://s3.amazonaws.com/evidence.jpg',
      } as any);

      prisma.evidenciaEtapa.create.mockResolvedValue({} as any);

      await service.upload(usuarioId, validInput, fileBuffer, 'image/jpeg');
      await service.upload(
        usuarioId,
        { ...validInput, latitude: -23.5510 },
        fileBuffer,
        'image/jpeg'
      );

      expect(prisma.evidenciaEtapa.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('listarPorEtapa - List Evidences by Stage', () => {
    it('should return evidences for etapa ordered by date descending', async () => {
      const etapaId = 'etapa-123';
      const mockEvidencias = [
        {
          evidenciaId: 'evid-1',
          etapaId,
          fotoUrl: 'https://s3.com/photo1.jpg',
          criadoEm: new Date('2024-02-01'),
        },
        {
          evidenciaId: 'evid-2',
          etapaId,
          fotoUrl: 'https://s3.com/photo2.jpg',
          criadoEm: new Date('2024-01-01'),
        },
      ];

      prisma.evidenciaEtapa.findMany.mockResolvedValue(mockEvidencias as any);

      const result = await service.listarPorEtapa(etapaId);

      expect(result).toEqual(mockEvidencias);
      expect(prisma.evidenciaEtapa.findMany).toHaveBeenCalledWith({
        where: { etapaId },
        orderBy: { criadoEm: 'desc' },
      });
    });

    it('should return empty array when no evidences for etapa', async () => {
      const etapaId = 'etapa-123';

      prisma.evidenciaEtapa.findMany.mockResolvedValue([]);

      const result = await service.listarPorEtapa(etapaId);

      expect(result).toEqual([]);
    });

    it('should return multiple evidences', async () => {
      const etapaId = 'etapa-123';
      const mockEvidencias = Array.from({ length: 10 }, (_, i) => ({
        evidenciaId: `evid-${i}`,
        etapaId,
        fotoUrl: `https://s3.com/photo${i}.jpg`,
        criadoEm: new Date(),
      }));

      prisma.evidenciaEtapa.findMany.mockResolvedValue(mockEvidencias as any);

      const result = await service.listarPorEtapa(etapaId);

      expect(result).toHaveLength(10);
    });
  });

  describe('validar - Validate Evidence', () => {
    it('should have validar method defined', () => {
      expect(service.validar).toBeDefined();
      expect(typeof service.validar).toBe('function');
    });
  });
});
