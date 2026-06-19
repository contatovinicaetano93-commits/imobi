import { Test } from "@nestjs/testing";
import { AdminService } from "./admin.service";
import { PrismaService } from "../prisma/prisma.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  sessaoToken: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  adminAuditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  obra: { count: jest.fn(), findMany: jest.fn() },
  credito: { count: jest.fn(), aggregate: jest.fn() },
  kycDocumento: { count: jest.fn() },
  etapaObra: { count: jest.fn() },
};

describe("AdminService — block/unblock", () => {
  let service: AdminService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  describe("bloquearUsuario", () => {
    it("blocks user and creates audit log", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        usuarioId: "uid1",
        bloqueadoEm: null,
        deletadoEm: null,
      });
      mockPrisma.usuario.update.mockResolvedValue({});
      mockPrisma.sessaoToken.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.$transaction.mockImplementation(async (ops: any[]) => Promise.all(ops));
      mockPrisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.bloquearUsuario("uid1", "admin-id", "Violação de termos");

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            acaoTipo: "USUARIO_BLOQUEADO",
            detalhes: "Violação de termos",
          }),
        }),
      );
    });

    it("throws BadRequestException when user is already blocked", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        usuarioId: "uid2",
        bloqueadoEm: new Date(),
        deletadoEm: null,
      });

      await expect(service.bloquearUsuario("uid2", "admin-id")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws NotFoundException when user does not exist", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.bloquearUsuario("nonexistent", "admin-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("desbloquearUsuario", () => {
    it("unblocks user and creates audit log", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        usuarioId: "uid3",
        bloqueadoEm: new Date(),
        deletadoEm: null,
      });
      mockPrisma.usuario.update.mockResolvedValue({});
      mockPrisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.desbloquearUsuario("uid3", "admin-id");

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ acaoTipo: "USUARIO_DESBLOQUEADO" }),
        }),
      );
    });

    it("throws BadRequestException when user is not blocked", async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        usuarioId: "uid4",
        bloqueadoEm: null,
        deletadoEm: null,
      });

      await expect(service.desbloquearUsuario("uid4", "admin-id")).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
