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

// ─────────────────────────────────────────────
// listarAuditLogs — pagination
// ─────────────────────────────────────────────
describe("AdminService – listarAuditLogs pagination", () => {
  const fakeLogs = [
    { auditId: "a1", acaoTipo: "USUARIO_CRIADO", criadoEm: new Date(), admin: { nome: "Admin", email: "a@a.com" }, alvo: null },
    { auditId: "a2", acaoTipo: "USUARIO_BLOQUEADO", criadoEm: new Date(), admin: { nome: "Admin", email: "a@a.com" }, alvo: { nome: "User", email: "u@u.com" } },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.adminAuditLog.findMany.mockResolvedValue(fakeLogs);
    mockPrisma.adminAuditLog.count.mockResolvedValue(42);
  });

  it("returns correct response shape with logs, total, page, pageSize", async () => {
    const result = await makeService().listarAuditLogs(20, 0);
    expect(result).toHaveProperty("logs");
    expect(result).toHaveProperty("total", 42);
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("pageSize", 20);
    expect(Array.isArray(result.logs)).toBe(true);
  });

  it("calculates page 1 when offset is 0", async () => {
    const result = await makeService().listarAuditLogs(20, 0);
    expect(result.page).toBe(1);
  });

  it("calculates page 2 when offset equals one page size", async () => {
    const result = await makeService().listarAuditLogs(20, 20);
    expect(result.page).toBe(2);
  });

  it("calculates page 3 when offset equals two page sizes", async () => {
    const result = await makeService().listarAuditLogs(10, 20);
    expect(result.page).toBe(3);
  });

  it("passes take=limit and skip=offset to Prisma", async () => {
    await makeService().listarAuditLogs(15, 30);
    expect(mockPrisma.adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 15, skip: 30 })
    );
  });

  it("queries logs ordered by criadoEm descending", async () => {
    await makeService().listarAuditLogs(20, 0);
    expect(mockPrisma.adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { criadoEm: "desc" } })
    );
  });

  it("returns logs returned by Prisma as-is", async () => {
    const result = await makeService().listarAuditLogs(20, 0);
    expect(result.logs).toEqual(fakeLogs);
  });

  it("reflects pageSize matching the limit argument", async () => {
    const result = await makeService().listarAuditLogs(5, 0);
    expect(result.pageSize).toBe(5);
  });
});
