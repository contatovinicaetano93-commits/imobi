import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { KycService } from "./kyc.service";

const mockPrisma = {
  usuario: { findUnique: jest.fn() },
  kycDocumento: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  kycAuditLog: { create: jest.fn() },
};

const mockNotificacoes = { criar: jest.fn().mockResolvedValue(undefined) };
const mockEmail = {
  kycAprovado: jest.fn().mockResolvedValue(undefined),
  kycRejeitado: jest.fn().mockResolvedValue(undefined),
};
const mockPush = { enviarPush: jest.fn().mockResolvedValue(undefined) };

function makeService() {
  return new KycService(
    mockPrisma as any,
    mockNotificacoes as any,
    mockEmail as any,
    mockPush as any,
  );
}

describe("KycService — uploadDocumento", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates document for existing user", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ usuarioId: "u1" });
    mockPrisma.kycDocumento.create.mockResolvedValue({ kycDocumentoId: "d1", tipo: "RG", url: "https://s3/rg.jpg", status: "PENDENTE" });

    const service = makeService();
    const result = await service.uploadDocumento("u1", "RG", "https://s3/rg.jpg");

    expect(result.kycDocumentoId).toBe("d1");
    expect(mockPrisma.kycDocumento.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usuarioId: "u1", tipo: "RG", status: "PENDENTE" }) })
    );
  });

  it("throws NotFoundException for unknown user", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.uploadDocumento("unknown", "RG", "https://s3/rg.jpg")).rejects.toThrow(NotFoundException);
  });
});

describe("KycService — obterStatus", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns NENHUM when no documents", async () => {
    mockPrisma.kycDocumento.findMany.mockResolvedValue([]);
    const service = makeService();
    const result = await service.obterStatus("u1");
    expect(result.status).toBe("NENHUM");
  });

  it("returns APROVADO when all docs approved", async () => {
    mockPrisma.kycDocumento.findMany.mockResolvedValue([
      { status: "APROVADO" },
      { status: "APROVADO" },
    ]);
    const service = makeService();
    const result = await service.obterStatus("u1");
    expect(result.status).toBe("APROVADO");
  });

  it("returns REJEITADO when any doc rejected", async () => {
    mockPrisma.kycDocumento.findMany.mockResolvedValue([
      { status: "APROVADO" },
      { status: "REJEITADO" },
    ]);
    const service = makeService();
    const result = await service.obterStatus("u1");
    expect(result.status).toBe("REJEITADO");
  });

  it("returns ENVIADO when some pending", async () => {
    mockPrisma.kycDocumento.findMany.mockResolvedValue([
      { status: "APROVADO" },
      { status: "PENDENTE" },
    ]);
    const service = makeService();
    const result = await service.obterStatus("u1");
    expect(result.status).toBe("ENVIADO");
  });
});

describe("KycService — aprovarDocumento", () => {
  beforeEach(() => jest.clearAllMocks());

  it("approves document, creates audit log and notifies user", async () => {
    const doc = { kycDocumentoId: "d1", usuarioId: "u1", tipo: "RG", usuario: { nome: "João", email: "j@t.com" } };
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(doc);
    mockPrisma.kycDocumento.update.mockResolvedValue({ ...doc, status: "APROVADO" });
    mockPrisma.kycAuditLog.create.mockResolvedValue({});

    const service = makeService();
    await service.aprovarDocumento("d1", "gestor-id");

    expect(mockPrisma.kycDocumento.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "APROVADO" }) })
    );
    expect(mockPrisma.kycAuditLog.create).toHaveBeenCalled();
    expect(mockNotificacoes.criar).toHaveBeenCalledWith(
      "u1", "KYC_APROVADO", expect.any(String), expect.any(String), expect.any(String)
    );
  });

  it("throws NotFoundException when document not found", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.aprovarDocumento("nonexistent", "gestor-id")).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when approving own document", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue({ kycDocumentoId: "d1", usuarioId: "gestor-id", tipo: "RG", usuario: { nome: "X", email: "x@x.com" } });
    const service = makeService();
    await expect(service.aprovarDocumento("d1", "gestor-id")).rejects.toThrow(ForbiddenException);
  });
});

describe("KycService — rejeitarDocumento", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects document with motivo and notifies user", async () => {
    const doc = { kycDocumentoId: "d1", usuarioId: "u1", tipo: "RG", usuario: { nome: "João", email: "j@t.com" } };
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(doc);
    mockPrisma.kycDocumento.update.mockResolvedValue({ ...doc, status: "REJEITADO" });
    mockPrisma.kycAuditLog.create.mockResolvedValue({});

    const service = makeService();
    await service.rejeitarDocumento("d1", "gestor-id", "Documento ilegível");

    expect(mockPrisma.kycDocumento.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REJEITADO" }) })
    );
    expect(mockNotificacoes.criar).toHaveBeenCalled();
  });

  it("throws BadRequestException when motivo is empty", async () => {
    const doc = { kycDocumentoId: "d1", usuarioId: "u1", tipo: "RG", usuario: { nome: "João", email: "j@t.com" } };
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(doc);
    const service = makeService();
    await expect(service.rejeitarDocumento("d1", "gestor-id", "  ")).rejects.toThrow(BadRequestException);
  });

  it("throws ForbiddenException when rejecting own document", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue({ kycDocumentoId: "d1", usuarioId: "gestor-id", tipo: "RG", usuario: { nome: "X", email: "x@x.com" } });
    const service = makeService();
    await expect(service.rejeitarDocumento("d1", "gestor-id", "Motivo qualquer")).rejects.toThrow(ForbiddenException);
  });

  it("throws NotFoundException when document not found", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.rejeitarDocumento("nonexistent", "gestor-id", "Motivo")).rejects.toThrow(NotFoundException);
  });
});
