import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { AdminService } from "./admin.service";

const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  sessaoToken: { updateMany: jest.fn() },
  adminAuditLog: { create: jest.fn(), createMany: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  $transaction: jest.fn(),
};

function makeService() {
  return new AdminService(mockPrisma as any);
}

const adminId = "admin-1";
const targetId = "user-1";

const baseUsuario = {
  usuarioId: targetId,
  nome: "Test User",
  email: "test@example.com",
  tipo: "TOMADOR",
  kycStatus: "PENDENTE",
  bloqueadoEm: null,
  funcoesBloqueadas: [],
  criadoEm: new Date(),
  deletadoEm: null,
};

// ─────────────────────────────────────────────
// criarUsuario — audit log
// ─────────────────────────────────────────────
describe("AdminService – criarUsuario audit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    mockPrisma.usuario.create.mockResolvedValue({
      usuarioId: targetId,
      nome: "New User",
      email: "new@example.com",
      tipo: "GESTOR",
      kycStatus: "PENDENTE",
      criadoEm: new Date(),
    });
    mockPrisma.adminAuditLog.create.mockResolvedValue({});
  });

  it("creates an audit log entry on user creation", async () => {
    await makeService().criarUsuario(
      { nome: "New User", email: "new@example.com", senha: "Senha@123", tipo: "GESTOR" as any },
      adminId
    );
    expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId,
          alvoId: targetId,
          acaoTipo: "USUARIO_CRIADO",
        }),
      })
    );
  });

  it("throws ConflictException when email already in use", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ ...baseUsuario, deletadoEm: null });
    await expect(
      makeService().criarUsuario(
        { nome: "Dup", email: "test@example.com", senha: "Senha@123", tipo: "TOMADOR" as any },
        adminId
      )
    ).rejects.toThrow(ConflictException);
    expect(mockPrisma.adminAuditLog.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// atualizarUsuario — audit on role/block changes
// ─────────────────────────────────────────────
describe("AdminService – atualizarUsuario audit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.usuario.findUnique.mockResolvedValue(baseUsuario);
    mockPrisma.usuario.update.mockResolvedValue({ ...baseUsuario });
    mockPrisma.sessaoToken.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.adminAuditLog.createMany.mockResolvedValue({ count: 1 });
  });

  it("creates USUARIO_TIPO_ALTERADO entry when role changes", async () => {
    await makeService().atualizarUsuario(targetId, { tipo: "GESTOR" as any }, adminId);
    expect(mockPrisma.adminAuditLog.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ acaoTipo: "USUARIO_TIPO_ALTERADO" }),
        ]),
      })
    );
  });

  it("does not create audit entry when role is unchanged", async () => {
    await makeService().atualizarUsuario(targetId, { tipo: "TOMADOR" as any }, adminId);
    expect(mockPrisma.adminAuditLog.createMany).not.toHaveBeenCalled();
  });

  it("creates USUARIO_BLOQUEADO entry when blocking user", async () => {
    await makeService().atualizarUsuario(targetId, { bloqueado: true }, adminId);
    expect(mockPrisma.adminAuditLog.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ acaoTipo: "USUARIO_BLOQUEADO" }),
        ]),
      })
    );
  });

  it("creates USUARIO_DESBLOQUEADO entry when unblocking a blocked user", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ ...baseUsuario, bloqueadoEm: new Date() });
    await makeService().atualizarUsuario(targetId, { bloqueado: false }, adminId);
    expect(mockPrisma.adminAuditLog.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ acaoTipo: "USUARIO_DESBLOQUEADO" }),
        ]),
      })
    );
  });

  it("does not create audit entry for non-sensitive field updates (nome, email)", async () => {
    await makeService().atualizarUsuario(targetId, { nome: "New Name" }, adminId);
    expect(mockPrisma.adminAuditLog.createMany).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when admin tries to block themselves", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ ...baseUsuario, usuarioId: adminId });
    await expect(
      makeService().atualizarUsuario(adminId, { bloqueado: true }, adminId)
    ).rejects.toThrow(BadRequestException);
  });

  it("throws NotFoundException for non-existent user", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    await expect(
      makeService().atualizarUsuario("nonexistent", { nome: "X" }, adminId)
    ).rejects.toThrow(NotFoundException);
  });
});

// ─────────────────────────────────────────────
// excluirUsuario — audit log
// ─────────────────────────────────────────────
describe("AdminService – excluirUsuario audit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.usuario.findUnique.mockResolvedValue(baseUsuario);
    mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, {}]);
    mockPrisma.adminAuditLog.create.mockResolvedValue({});
  });

  it("creates USUARIO_EXCLUIDO audit entry", async () => {
    await makeService().excluirUsuario(targetId, adminId);
    expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId,
          acaoTipo: "USUARIO_EXCLUIDO",
        }),
      })
    );
  });

  it("throws BadRequestException when admin tries to delete themselves", async () => {
    await expect(makeService().excluirUsuario(adminId, adminId)).rejects.toThrow(BadRequestException);
    expect(mockPrisma.adminAuditLog.create).not.toHaveBeenCalled();
  });

  it("throws NotFoundException for non-existent user", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    await expect(makeService().excluirUsuario("nonexistent", adminId)).rejects.toThrow(NotFoundException);
    expect(mockPrisma.adminAuditLog.create).not.toHaveBeenCalled();
  });
});
