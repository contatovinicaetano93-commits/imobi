import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { KycService } from "../kyc/kyc.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";

describe("KycService", () => {
  let service: KycService;
  let prisma: jest.Mocked<PrismaService>;
  let notificacoes: jest.Mocked<NotificacoesService>;
  let email: jest.Mocked<EmailService>;
  let pushNotificacoes: jest.Mocked<PushNotificacoesService>;

  beforeEach(async () => {
    const prismaMock = {
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

    const notificacoesMock = {
      criar: jest.fn(),
    };

    const emailMock = {
      kycAprovadoEmail: jest.fn(),
      kycRejeitadoEmail: jest.fn(),
    };

    const pushNotificacoesMock = {
      enviarPush: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: NotificacoesService,
          useValue: notificacoesMock,
        },
        {
          provide: EmailService,
          useValue: emailMock,
        },
        {
          provide: PushNotificacoesService,
          useValue: pushNotificacoesMock,
        },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    notificacoes = module.get(NotificacoesService) as jest.Mocked<NotificacoesService>;
    email = module.get(EmailService) as jest.Mocked<EmailService>;
    pushNotificacoes = module.get(PushNotificacoesService) as jest.Mocked<PushNotificacoesService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("uploadDocumento", () => {
    it("should upload document successfully", async () => {
      const usuarioId = "user-123";
      const tipo = "RG";
      const url = "https://s3.../documento.pdf";

      prisma.usuario.findUnique.mockResolvedValue({
        usuarioId,
        nome: "João",
      } as any);
      prisma.kycDocumento.create.mockResolvedValue({
        kycDocumentoId: "doc-123",
        usuarioId,
        tipo,
        url,
        status: "PENDENTE",
      } as any);

      const result = await service.uploadDocumento(usuarioId, tipo, url);

      expect(result.kycDocumentoId).toBe("doc-123");
      expect(result.status).toBe("PENDENTE");
      expect(prisma.kycDocumento.create).toHaveBeenCalledWith({
        data: { usuarioId, tipo, url, status: "PENDENTE" },
      });
    });

    it("should throw NotFoundException if usuario not found", async () => {
      const usuarioId = "nonexistent";
      const tipo = "RG";
      const url = "https://s3.../documento.pdf";

      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadDocumento(usuarioId, tipo, url),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.uploadDocumento(usuarioId, tipo, url),
      ).rejects.toThrow("Usuário não encontrado");
    });
  });

  describe("listarDocumentos", () => {
    it("should list documents ordered by creation date", async () => {
      const usuarioId = "user-123";
      const documentos = [
        {
          kycDocumentoId: "doc-1",
          usuarioId,
          tipo: "RG",
          status: "PENDENTE",
          criadoEm: new Date("2024-06-02"),
        },
        {
          kycDocumentoId: "doc-2",
          usuarioId,
          tipo: "Selfie",
          status: "APROVADO",
          criadoEm: new Date("2024-06-01"),
        },
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(documentos as any);

      const result = await service.listarDocumentos(usuarioId);

      expect(result).toHaveLength(2);
      expect(prisma.kycDocumento.findMany).toHaveBeenCalledWith({
        where: { usuarioId },
        orderBy: { criadoEm: "desc" },
      });
    });

    it("should return empty array if no documents", async () => {
      const usuarioId = "user-123";
      prisma.kycDocumento.findMany.mockResolvedValue([]);

      const result = await service.listarDocumentos(usuarioId);

      expect(result).toHaveLength(0);
    });
  });

  describe("obterStatus", () => {
    it("should return correct status summary", async () => {
      const usuarioId = "user-123";
      const documentos = [
        { kycDocumentoId: "doc-1", tipo: "RG", status: "APROVADO" },
        { kycDocumentoId: "doc-2", tipo: "Selfie", status: "PENDENTE" },
        { kycDocumentoId: "doc-3", tipo: "CNH", status: "REJEITADO" },
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(documentos as any);

      const result = await service.obterStatus(usuarioId);

      expect(result.usuarioId).toBe(usuarioId);
      expect(result.status).toBe("ENVIADO");
      expect(result.resumo.aprovados).toBe(1);
      expect(result.resumo.pendentes).toBe(1);
      expect(result.resumo.rejeitados).toBe(1);
    });

    it("should return NENHUM status if no documents", async () => {
      const usuarioId = "user-123";
      prisma.kycDocumento.findMany.mockResolvedValue([]);

      const result = await service.obterStatus(usuarioId);

      expect(result.status).toBe("NENHUM");
      expect(result.resumo.aprovados).toBe(0);
    });
  });

  describe("aprovarDocumento", () => {
    it("should approve document and send notifications", async () => {
      const kycDocumentoId = "doc-123";
      const gestorId = "gestor-123";
      const usuario = {
        usuarioId: "user-123",
        nome: "João",
        email: "joao@test.com",
      };

      const documento = {
        kycDocumentoId,
        usuarioId: usuario.usuarioId,
        tipo: "RG",
        usuario,
      };

      prisma.kycDocumento.findUnique.mockResolvedValue(documento as any);
      prisma.kycDocumento.update.mockResolvedValue({
        kycDocumentoId,
        status: "APROVADO",
        analisadoPor: gestorId,
        analisadoEm: new Date(),
      } as any);
      notificacoes.criar.mockResolvedValue({} as any);
      email.kycAprovadoEmail.mockResolvedValue({} as any);

      const result = await service.aprovarDocumento(kycDocumentoId, gestorId);

      expect(result.status).toBe("APROVADO");
      expect(result.analisadoPor).toBe(gestorId);
      expect(notificacoes.criar).toHaveBeenCalledWith(
        usuario.usuarioId,
        "KYC_APROVADO",
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
      expect(pushNotificacoes.enviarPush).toHaveBeenCalled();
      expect(email.kycAprovadoEmail).toHaveBeenCalledWith(
        usuario.nome,
        usuario.email,
      );
    });

    it("should throw NotFoundException if document not found", async () => {
      const kycDocumentoId = "nonexistent";
      const gestorId = "gestor-123";

      prisma.kycDocumento.findUnique.mockResolvedValue(null);

      await expect(
        service.aprovarDocumento(kycDocumentoId, gestorId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.aprovarDocumento(kycDocumentoId, gestorId),
      ).rejects.toThrow("Documento não encontrado");
    });
  });

  describe("rejeitarDocumento", () => {
    it("should reject document with reason and send notifications", async () => {
      const kycDocumentoId = "doc-123";
      const gestorId = "gestor-123";
      const motivo = "Documento ilegível";
      const usuario = {
        usuarioId: "user-123",
        nome: "João",
        email: "joao@test.com",
      };

      const documento = {
        kycDocumentoId,
        usuarioId: usuario.usuarioId,
        tipo: "RG",
        usuario,
      };

      prisma.kycDocumento.findUnique.mockResolvedValue(documento as any);
      prisma.kycDocumento.update.mockResolvedValue({
        kycDocumentoId,
        status: "REJEITADO",
        analisadoPor: gestorId,
        motivo_rejeicao: motivo,
      } as any);
      notificacoes.criar.mockResolvedValue({} as any);
      email.kycRejeitadoEmail.mockResolvedValue({} as any);

      const result = await service.rejeitarDocumento(
        kycDocumentoId,
        gestorId,
        motivo,
      );

      expect(result.status).toBe("REJEITADO");
      expect(result.motivo_rejeicao).toBe(motivo);
      expect(notificacoes.criar).toHaveBeenCalledWith(
        usuario.usuarioId,
        "KYC_REJEITADO",
        expect.any(String),
        expect.stringContaining(motivo),
        expect.any(String),
      );
      expect(email.kycRejeitadoEmail).toHaveBeenCalledWith(
        usuario.nome,
        usuario.email,
        motivo,
      );
    });

    it("should throw BadRequestException if motivo is empty", async () => {
      const kycDocumentoId = "doc-123";
      const gestorId = "gestor-123";

      await expect(
        service.rejeitarDocumento(kycDocumentoId, gestorId, ""),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.rejeitarDocumento(kycDocumentoId, gestorId, "   "),
      ).rejects.toThrow("Motivo da rejeição é obrigatório");
    });
  });

  describe("listarPendentes", () => {
    it("should list pending documents ordered by creation date", async () => {
      const pendentes = [
        {
          kycDocumentoId: "doc-1",
          tipo: "RG",
          status: "PENDENTE",
          usuario: { nome: "João", email: "joao@test.com" },
          criadoEm: new Date("2024-06-01"),
        },
        {
          kycDocumentoId: "doc-2",
          tipo: "Selfie",
          status: "PENDENTE",
          usuario: { nome: "Maria", email: "maria@test.com" },
          criadoEm: new Date("2024-06-02"),
        },
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(pendentes as any);

      const result = await service.listarPendentes();

      expect(result).toHaveLength(2);
      expect(prisma.kycDocumento.findMany).toHaveBeenCalledWith({
        where: { status: "PENDENTE" },
        include: { usuario: { select: { nome: true, email: true } } },
        orderBy: { criadoEm: "asc" },
      });
    });
  });

  describe("verificarKycCompleto", () => {
    it("should mark KYC as complete when required documents approved", async () => {
      const usuarioId = "user-123";
      const documentos = [
        { kycDocumentoId: "doc-1", tipo: "RG", status: "APROVADO" },
        { kycDocumentoId: "doc-2", tipo: "Selfie", status: "APROVADO" },
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(documentos as any);
      prisma.usuario.update.mockResolvedValue({
        usuarioId,
        kycStatus: "APROVADO",
      } as any);

      const result = await service.verificarKycCompleto(usuarioId);

      expect(result.completo).toBe(true);
      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { usuarioId },
        data: { kycStatus: "APROVADO" },
      });
    });

    it("should return false if required documents missing", async () => {
      const usuarioId = "user-123";
      const documentos = [
        { kycDocumentoId: "doc-1", tipo: "RG", status: "APROVADO" },
        // Selfie missing
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(documentos as any);

      const result = await service.verificarKycCompleto(usuarioId);

      expect(result.completo).toBe(false);
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it("should return false if documents are not approved", async () => {
      const usuarioId = "user-123";
      const documentos = [
        { kycDocumentoId: "doc-1", tipo: "RG", status: "PENDENTE" },
        { kycDocumentoId: "doc-2", tipo: "Selfie", status: "PENDENTE" },
      ];

      prisma.kycDocumento.findMany.mockResolvedValue(documentos as any);

      const result = await service.verificarKycCompleto(usuarioId);

      expect(result.completo).toBe(false);
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });
  });
});
