import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { KycService } from './kyc.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { EmailService } from '../email/email.service';
import { PushNotificacoesService } from '../push-notificacoes/push-notificacoes.service';
import { StorageService } from '../storage/storage.service';

describe('KycService', () => {
  let service: KycService;
  let prisma: jest.Mocked<PrismaService>;
  let notificacoes: jest.Mocked<NotificacoesService>;
  let email: jest.Mocked<EmailService>;
  let pushNotificacoes: jest.Mocked<PushNotificacoesService>;
  let storage: jest.Mocked<StorageService>;

  const mockPrismaService = {
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    kycDocumento: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotificacoesService = {
    criar: jest.fn(),
  };

  const mockEmailService = {
    kycAprovadoEmail: jest.fn(),
    kycRejeitadoEmail: jest.fn(),
  };

  const mockPushNotificacoesService = {
    enviarPush: jest.fn(),
  };

  const mockStorageService = {
    uploadarDocumento: jest.fn(),
    deletarDocumento: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificacoesService,
          useValue: mockNotificacoesService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: PushNotificacoesService,
          useValue: mockPushNotificacoesService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    notificacoes = module.get(NotificacoesService) as jest.Mocked<NotificacoesService>;
    email = module.get(EmailService) as jest.Mocked<EmailService>;
    pushNotificacoes = module.get(PushNotificacoesService) as jest.Mocked<PushNotificacoesService>;
    storage = module.get(StorageService) as jest.Mocked<StorageService>;

    mockEmailService.kycAprovadoEmail.mockResolvedValue(undefined);
    mockEmailService.kycRejeitadoEmail.mockResolvedValue(undefined);
    mockPushNotificacoesService.enviarPush.mockResolvedValue(undefined);
    mockNotificacoesService.criar.mockResolvedValue(undefined);
  });

  describe('uploadDocumento - Upload KYC Document', () => {
    it('should upload document successfully for existing user', async () => {
      const usuarioId = 'user-123';
      const tipo = 'RG';
      const url = 'https://s3.amazonaws.com/docs/rg-123.pdf';

      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        email: 'test@example.com',
      } as any);

      const mockDocument = {
        kycDocumentoId: 'doc-123',
        usuarioId,
        tipo,
        url,
        status: 'PENDENTE',
        criadoEm: new Date(),
      };

      prisma.kycDocumento.create.mockResolvedValue(mockDocument as any);

      const result = await service.uploadDocumento(usuarioId, tipo, url);

      expect(result).toEqual(mockDocument);
      expect(prisma.kycDocumento.create).toHaveBeenCalledWith({
        data: { usuarioId, tipo, url, status: 'PENDENTE' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      const usuarioId = 'invalid-user';

      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.uploadDocumento(usuarioId, 'RG', 'https://s3.com/doc.pdf')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      const usuarioId = 'invalid-user';

      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.uploadDocumento(usuarioId, 'RG', 'https://s3.com/doc.pdf')).rejects.toThrow(
        'Usuário não encontrado'
      );
    });

    it('should set document status as PENDENTE', async () => {
      const usuarioId = 'user-123';

      prisma.usuario.findUnique.mockResolvedValue({ usuarioId } as any);
      prisma.kycDocumento.create.mockResolvedValue({
        kycDocumentoId: 'doc-123',
        usuarioId,
        tipo: 'Selfie',
        url: 'https://s3.com/selfie.jpg',
        status: 'PENDENTE',
        criadoEm: new Date(),
      } as any);

      await service.uploadDocumento(usuarioId, 'Selfie', 'https://s3.com/selfie.jpg');

      const callArgs = prisma.kycDocumento.create.mock.calls[0][0];
      expect(callArgs.data.status).toBe('PENDENTE');
    });

    it('should accept different document types', async () => {
      const usuarioId = 'user-123';
      const tipos = ['RG', 'CPF', 'Selfie', 'Comprovante de Endereco'];

      prisma.usuario.findUnique.mockResolvedValue({ usuarioId } as any);

      for (const tipo of tipos) {
        prisma.kycDocumento.create.mockResolvedValue({
          kycDocumentoId: `doc-${tipo}`,
          usuarioId,
          tipo,
          url: `https://s3.com/${tipo}.pdf`,
          status: 'PENDENTE',
          criadoEm: new Date(),
        } as any);

        const result = await service.uploadDocumento(usuarioId, tipo, `https://s3.com/${tipo}.pdf`);

        expect(result.tipo).toBe(tipo);
      }
    });
  });

  describe('listarDocumentos - List User Documents', () => {
    it('should return documents for user ordered by date descending', async () => {
      const usuarioId = 'user-123';
      const mockDocuments = [
        {
          kycDocumentoId: 'doc-1',
          usuarioId,
          tipo: 'Selfie',
          status: 'PENDENTE',
          criadoEm: new Date('2024-02-01'),
        },
        {
          kycDocumentoId: 'doc-2',
          usuarioId,
          tipo: 'RG',
          status: 'PENDENTE',
          criadoEm: new Date('2024-01-01'),
        },
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(mockDocuments as any);

      const result = await service.listarDocumentos(usuarioId);

      expect(result).toEqual(mockDocuments);
      expect(prisma.kycDocumento.findMany).toHaveBeenCalledWith({
        where: { usuarioId },
        orderBy: { criadoEm: 'desc' },
      });
    });

    it('should return empty array when user has no documents', async () => {
      const usuarioId = 'user-123';

      prisma.kycDocumento.findMany.mockResolvedValue([]);

      const result = await service.listarDocumentos(usuarioId);

      expect(result).toEqual([]);
    });

    it('should return multiple documents', async () => {
      const usuarioId = 'user-123';
      const mockDocuments = Array.from({ length: 5 }, (_, i) => ({
        kycDocumentoId: `doc-${i}`,
        usuarioId,
        tipo: 'RG',
        status: 'PENDENTE',
        criadoEm: new Date(),
      }));

      prisma.kycDocumento.findMany.mockResolvedValue(mockDocuments as any);

      const result = await service.listarDocumentos(usuarioId);

      expect(result).toHaveLength(5);
    });
  });

  describe('obterStatus - Get KYC Status', () => {
    it('should return status NENHUM when no documents', async () => {
      const usuarioId = 'user-123';

      prisma.kycDocumento.findMany.mockResolvedValue([]);

      const result = await service.obterStatus(usuarioId);

      expect(result.status).toBe('NENHUM');
    });

    it('should return status ENVIADO when documents exist', async () => {
      const usuarioId = 'user-123';
      const mockDocuments = [
        { kycDocumentoId: 'doc-1', status: 'PENDENTE', usuarioId } as any,
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(mockDocuments);

      const result = await service.obterStatus(usuarioId);

      expect(result.status).toBe('ENVIADO');
    });

    it('should count pending documents correctly', async () => {
      const usuarioId = 'user-123';
      const mockDocuments = [
        { kycDocumentoId: 'doc-1', status: 'PENDENTE', usuarioId } as any,
        { kycDocumentoId: 'doc-2', status: 'PENDENTE', usuarioId } as any,
        { kycDocumentoId: 'doc-3', status: 'APROVADO', usuarioId } as any,
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(mockDocuments);

      const result = await service.obterStatus(usuarioId);

      expect(result.resumo.pendentes).toBe(2);
    });

    it('should count approved documents correctly', async () => {
      const usuarioId = 'user-123';
      const mockDocuments = [
        { kycDocumentoId: 'doc-1', status: 'APROVADO', usuarioId } as any,
        { kycDocumentoId: 'doc-2', status: 'APROVADO', usuarioId } as any,
        { kycDocumentoId: 'doc-3', status: 'REJEITADO', usuarioId } as any,
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(mockDocuments);

      const result = await service.obterStatus(usuarioId);

      expect(result.resumo.aprovados).toBe(2);
    });

    it('should count rejected documents correctly', async () => {
      const usuarioId = 'user-123';
      const mockDocuments = [
        { kycDocumentoId: 'doc-1', status: 'REJEITADO', usuarioId } as any,
        { kycDocumentoId: 'doc-2', status: 'REJEITADO', usuarioId } as any,
        { kycDocumentoId: 'doc-3', status: 'APROVADO', usuarioId } as any,
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(mockDocuments);

      const result = await service.obterStatus(usuarioId);

      expect(result.resumo.rejeitados).toBe(2);
    });

    it('should return all documents in status response', async () => {
      const usuarioId = 'user-123';
      const mockDocuments = [
        { kycDocumentoId: 'doc-1', status: 'PENDENTE', usuarioId } as any,
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(mockDocuments);

      const result = await service.obterStatus(usuarioId);

      expect(result.documentos).toEqual(mockDocuments);
    });
  });

  describe('aprovarDocumento - Approve Document', () => {
    it('should update document status to APROVADO', async () => {
      const kycDocumentoId = 'doc-123';
      const gestorId = 'gestor-456';

      const mockDocument = {
        kycDocumentoId,
        usuarioId: 'user-123',
        tipo: 'RG',
        status: 'PENDENTE',
        usuario: { nome: 'João Silva', email: 'joao@example.com' },
      } as any;

      prisma.kycDocumento.findUnique.mockResolvedValue(mockDocument);
      prisma.kycDocumento.update.mockResolvedValue({
        ...mockDocument,
        status: 'APROVADO',
      } as any);

      const result = await service.aprovarDocumento(kycDocumentoId, gestorId);

      expect(result.status).toBe('APROVADO');
    });

    it('should record approving user (analisadoPor)', async () => {
      const kycDocumentoId = 'doc-123';
      const gestorId = 'gestor-456';

      prisma.kycDocumento.findUnique.mockResolvedValue({
        kycDocumentoId,
        usuarioId: 'user-123',
        usuario: { nome: 'João', email: 'joao@example.com' },
      } as any);

      prisma.kycDocumento.update.mockResolvedValue({} as any);

      await service.aprovarDocumento(kycDocumentoId, gestorId);

      const callArgs = prisma.kycDocumento.update.mock.calls[0][0];
      expect(callArgs.data.analisadoPor).toBe(gestorId);
    });

    it('should record approval date (analisadoEm)', async () => {
      const kycDocumentoId = 'doc-123';
      const gestorId = 'gestor-456';

      prisma.kycDocumento.findUnique.mockResolvedValue({
        kycDocumentoId,
        usuarioId: 'user-123',
        usuario: { nome: 'João', email: 'joao@example.com' },
      } as any);

      prisma.kycDocumento.update.mockResolvedValue({} as any);

      await service.aprovarDocumento(kycDocumentoId, gestorId);

      const callArgs = prisma.kycDocumento.update.mock.calls[0][0];
      expect(callArgs.data).toHaveProperty('analisadoEm');
    });

    it('should throw NotFoundException when document not found', async () => {
      const kycDocumentoId = 'invalid-doc';

      prisma.kycDocumento.findUnique.mockResolvedValue(null);

      await expect(service.aprovarDocumento(kycDocumentoId, 'gestor-456')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should send notification when document approved', async () => {
      const kycDocumentoId = 'doc-123';
      const gestorId = 'gestor-456';

      prisma.kycDocumento.findUnique.mockResolvedValue({
        kycDocumentoId,
        usuarioId: 'user-123',
        tipo: 'RG',
        usuario: { nome: 'João', email: 'joao@example.com' },
      } as any);

      prisma.kycDocumento.update.mockResolvedValue({} as any);
      notificacoes.criar.mockResolvedValue({} as any);

      await service.aprovarDocumento(kycDocumentoId, gestorId);

      expect(notificacoes.criar).toHaveBeenCalledWith(
        'user-123',
        'KYC_APROVADO',
        'Documento KYC aprovado',
        expect.any(String),
        '/dashboard/perfil'
      );
    });

    it('should send push notification when document approved', async () => {
      const kycDocumentoId = 'doc-123';
      const gestorId = 'gestor-456';

      prisma.kycDocumento.findUnique.mockResolvedValue({
        kycDocumentoId,
        usuarioId: 'user-123',
        tipo: 'RG',
        usuario: { nome: 'João', email: 'joao@example.com' },
      } as any);

      prisma.kycDocumento.update.mockResolvedValue({} as any);
      mockPushNotificacoesService.enviarPush.mockResolvedValue({} as any);

      await service.aprovarDocumento(kycDocumentoId, gestorId);

      expect(mockPushNotificacoesService.enviarPush).toHaveBeenCalled();
    });

    it('should send email when document approved', async () => {
      const kycDocumentoId = 'doc-123';
      const gestorId = 'gestor-456';
      const usuarioNome = 'João Silva';
      const usuarioEmail = 'joao@example.com';

      prisma.kycDocumento.findUnique.mockResolvedValue({
        kycDocumentoId,
        usuarioId: 'user-123',
        tipo: 'RG',
        usuario: { nome: usuarioNome, email: usuarioEmail },
      } as any);

      prisma.kycDocumento.update.mockResolvedValue({} as any);
      mockEmailService.kycAprovadoEmail.mockResolvedValue({} as any);

      await service.aprovarDocumento(kycDocumentoId, gestorId);

      expect(mockEmailService.kycAprovadoEmail).toHaveBeenCalledWith(usuarioNome, usuarioEmail);
    });
  });

  describe('rejeitarDocumento - Reject Document', () => {
    it('should update document status to REJEITADO', async () => {
      const kycDocumentoId = 'doc-123';
      const gestorId = 'gestor-456';
      const motivo = 'Documento ilegível';

      prisma.kycDocumento.findUnique.mockResolvedValue({
        kycDocumentoId,
        usuarioId: 'user-123',
        usuario: { nome: 'João', email: 'joao@example.com' },
      } as any);

      prisma.kycDocumento.update.mockResolvedValue({
        status: 'REJEITADO',
      } as any);

      const result = await service.rejeitarDocumento(kycDocumentoId, gestorId, motivo);

      expect(result.status).toBe('REJEITADO');
    });

    it('should record rejection reason', async () => {
      const kycDocumentoId = 'doc-123';
      const gestorId = 'gestor-456';
      const motivo = 'Documento ilegível';

      prisma.kycDocumento.findUnique.mockResolvedValue({
        kycDocumentoId,
        usuarioId: 'user-123',
        usuario: { nome: 'João', email: 'joao@example.com' },
      } as any);

      prisma.kycDocumento.update.mockResolvedValue({} as any);

      await service.rejeitarDocumento(kycDocumentoId, gestorId, motivo);

      const callArgs = prisma.kycDocumento.update.mock.calls[0][0];
      expect(callArgs.data.motivo_rejeicao).toBe(motivo);
    });

    it('should throw BadRequestException when motivo is empty', async () => {
      const kycDocumentoId = 'doc-123';
      const gestorId = 'gestor-456';

      prisma.kycDocumento.findUnique.mockResolvedValue({
        kycDocumentoId,
        usuarioId: 'user-123',
      } as any);

      await expect(service.rejeitarDocumento(kycDocumentoId, gestorId, '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when motivo is only whitespace', async () => {
      const kycDocumentoId = 'doc-123';
      const gestorId = 'gestor-456';

      prisma.kycDocumento.findUnique.mockResolvedValue({
        kycDocumentoId,
        usuarioId: 'user-123',
      } as any);

      await expect(service.rejeitarDocumento(kycDocumentoId, gestorId, '   ')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException when document not found', async () => {
      const kycDocumentoId = 'invalid-doc';

      prisma.kycDocumento.findUnique.mockResolvedValue(null);

      await expect(service.rejeitarDocumento(kycDocumentoId, 'gestor-456', 'motivo')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should send notification when document rejected', async () => {
      const kycDocumentoId = 'doc-123';
      const gestorId = 'gestor-456';
      const motivo = 'Documento ilegível';

      prisma.kycDocumento.findUnique.mockResolvedValue({
        kycDocumentoId,
        usuarioId: 'user-123',
        tipo: 'RG',
        usuario: { nome: 'João', email: 'joao@example.com' },
      } as any);

      prisma.kycDocumento.update.mockResolvedValue({} as any);

      await service.rejeitarDocumento(kycDocumentoId, gestorId, motivo);

      expect(notificacoes.criar).toHaveBeenCalled();
    });

    it('should send email when document rejected', async () => {
      const kycDocumentoId = 'doc-123';
      const gestorId = 'gestor-456';
      const motivo = 'Documento ilegível';
      const usuarioNome = 'João Silva';
      const usuarioEmail = 'joao@example.com';

      prisma.kycDocumento.findUnique.mockResolvedValue({
        kycDocumentoId,
        usuarioId: 'user-123',
        usuario: { nome: usuarioNome, email: usuarioEmail },
      } as any);

      prisma.kycDocumento.update.mockResolvedValue({} as any);

      await service.rejeitarDocumento(kycDocumentoId, gestorId, motivo);

      expect(mockEmailService.kycRejeitadoEmail).toHaveBeenCalledWith(usuarioNome, usuarioEmail, motivo);
    });
  });

  describe('listarPendentes - List Pending Documents', () => {
    it('should return documents with status PENDENTE', async () => {
      const mockPendentes = [
        {
          kycDocumentoId: 'doc-1',
          status: 'PENDENTE',
          usuario: { nome: 'João', email: 'joao@example.com', cpf: '123.456.789-00' },
          criadoEm: new Date(),
        },
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(mockPendentes as any);

      const result = await service.listarPendentes();

      expect(result).toEqual(mockPendentes);
    });

    it('should order pending documents by creation date ascending', async () => {
      prisma.kycDocumento.findMany.mockResolvedValue([]);

      await service.listarPendentes();

      const callArgs = prisma.kycDocumento.findMany.mock.calls[0][0];
      expect(callArgs?.orderBy).toEqual({ criadoEm: 'asc' });
    });

    it('should include user information in results', async () => {
      prisma.kycDocumento.findMany.mockResolvedValue([]);

      await service.listarPendentes();

      const callArgs = prisma.kycDocumento.findMany.mock.calls[0][0];
      expect(callArgs?.include?.usuario).toHaveProperty('select');
    });

    it('should return empty array when no pending documents', async () => {
      prisma.kycDocumento.findMany.mockResolvedValue([]);

      const result = await service.listarPendentes();

      expect(result).toEqual([]);
    });
  });

  describe('verificarKycCompleto - Verify Complete KYC', () => {
    it('should return incomplete when missing required documents', async () => {
      const usuarioId = 'user-123';

      prisma.kycDocumento.findMany.mockResolvedValue([
        { kycDocumentoId: 'doc-1', tipo: 'RG', status: 'APROVADO' } as any,
      ]);

      const result = await service.verificarKycCompleto(usuarioId);

      expect(result.completo).toBe(false);
    });

    it('should return complete when all required documents approved', async () => {
      const usuarioId = 'user-123';

      prisma.kycDocumento.findMany.mockResolvedValue([
        { kycDocumentoId: 'doc-1', tipo: 'RG', status: 'APROVADO' } as any,
        { kycDocumentoId: 'doc-2', tipo: 'Selfie', status: 'APROVADO' } as any,
      ]);

      const result = await service.verificarKycCompleto(usuarioId);

      expect(result.completo).toBe(true);
    });

    it('should update user KYC status to APROVADO when complete', async () => {
      const usuarioId = 'user-123';

      prisma.kycDocumento.findMany.mockResolvedValue([
        { kycDocumentoId: 'doc-1', tipo: 'RG', status: 'APROVADO' } as any,
        { kycDocumentoId: 'doc-2', tipo: 'Selfie', status: 'APROVADO' } as any,
      ]);

      prisma.usuario.update.mockResolvedValue({} as any);

      await service.verificarKycCompleto(usuarioId);

      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { usuarioId },
        data: { kycStatus: 'APROVADO' },
      });
    });

    it('should not update user KYC status when incomplete', async () => {
      const usuarioId = 'user-123';

      prisma.kycDocumento.findMany.mockResolvedValue([
        { kycDocumentoId: 'doc-1', tipo: 'RG', status: 'APROVADO' } as any,
      ]);

      await service.verificarKycCompleto(usuarioId);

      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it('should return documents list in response', async () => {
      const usuarioId = 'user-123';
      const mockDocs = [
        { kycDocumentoId: 'doc-1', tipo: 'RG', status: 'APROVADO' } as any,
        { kycDocumentoId: 'doc-2', tipo: 'Selfie', status: 'APROVADO' } as any,
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(mockDocs);

      const result = await service.verificarKycCompleto(usuarioId);

      expect(result.documentos).toEqual(mockDocs);
    });

    it('should only count APROVADO documents as complete', async () => {
      const usuarioId = 'user-123';

      // Service filters for status: "APROVADO" in query, so only APROVADO docs are returned
      prisma.kycDocumento.findMany.mockResolvedValue([
        { kycDocumentoId: 'doc-1', tipo: 'RG', status: 'APROVADO' } as any,
      ]);

      const result = await service.verificarKycCompleto(usuarioId);

      expect(result.completo).toBe(false);
    });

    it('should require both RG and Selfie documents', async () => {
      const usuarioId = 'user-123';

      prisma.kycDocumento.findMany.mockResolvedValue([
        { kycDocumentoId: 'doc-1', tipo: 'CPF', status: 'APROVADO' } as any,
        { kycDocumentoId: 'doc-2', tipo: 'Comprovante de Endereco', status: 'APROVADO' } as any,
      ]);

      const result = await service.verificarKycCompleto(usuarioId);

      expect(result.completo).toBe(false);
    });
  });
});
