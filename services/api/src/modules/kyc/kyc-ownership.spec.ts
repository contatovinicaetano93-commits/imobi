import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { KycService } from "./kyc.service";

const gestorId = "gestor-1";
const ownerId = "owner-1";
const docId = "doc-1";

const mockDoc = (usuarioId: string) => ({
  kycDocumentoId: docId,
  usuarioId,
  tipo: "RG",
  url: "https://s3.example.com/rg.jpg",
  status: "PENDENTE",
  usuario: { nome: "Maria", email: "maria@test.com" },
});

const mockPrisma = {
  usuario: { findUnique: jest.fn() },
  kycDocumento: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
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

// ─────────────────────────────────────────────────────────────────
// aprovarDocumento — ownership & validation
// ─────────────────────────────────────────────────────────────────
describe("KycService – aprovarDocumento", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.kycAuditLog.create.mockResolvedValue({});
    mockPrisma.kycDocumento.update.mockResolvedValue({ kycDocumentoId: docId, status: "APROVADO" });
    mockNotificacoes.criar.mockResolvedValue(undefined);
    mockPush.enviarPush.mockResolvedValue(undefined);
    mockEmail.kycAprovado.mockResolvedValue(undefined);
  });

  it("throws NotFoundException when documento does not exist", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(null);
    await expect(makeService().aprovarDocumento(docId, gestorId)).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when gestor tries to approve own document", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(mockDoc(gestorId));
    await expect(makeService().aprovarDocumento(docId, gestorId)).rejects.toThrow(ForbiddenException);
  });

  it("approves document when gestor is different from owner", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(mockDoc(ownerId));
    const result = await makeService().aprovarDocumento(docId, gestorId);
    expect(result).toHaveProperty("status", "APROVADO");
  });

  it("writes audit log with APROVADO action", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(mockDoc(ownerId));

    await makeService().aprovarDocumento(docId, gestorId);

    expect(mockPrisma.kycAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kycDocumentoId: docId, acaoTipo: "APROVADO", usuarioId: gestorId }),
      })
    );
  });

  it("notifies document owner after approval", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(mockDoc(ownerId));

    await makeService().aprovarDocumento(docId, gestorId);

    expect(mockNotificacoes.criar).toHaveBeenCalledWith(
      ownerId,
      "KYC_APROVADO",
      expect.any(String),
      expect.any(String),
      expect.any(String)
    );
  });
});

// ─────────────────────────────────────────────────────────────────
// rejeitarDocumento — ownership & validation
// ─────────────────────────────────────────────────────────────────
describe("KycService – rejeitarDocumento", () => {
  const motivo = "Documento ilegível";

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.kycAuditLog.create.mockResolvedValue({});
    mockPrisma.kycDocumento.update.mockResolvedValue({ kycDocumentoId: docId, status: "REJEITADO" });
    mockNotificacoes.criar.mockResolvedValue(undefined);
    mockPush.enviarPush.mockResolvedValue(undefined);
    mockEmail.kycRejeitado.mockResolvedValue(undefined);
  });

  it("throws NotFoundException when documento does not exist", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(null);
    await expect(makeService().rejeitarDocumento(docId, gestorId, motivo)).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when gestor tries to reject own document", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(mockDoc(gestorId));
    await expect(makeService().rejeitarDocumento(docId, gestorId, motivo)).rejects.toThrow(ForbiddenException);
  });

  it("throws BadRequestException when motivo is empty string", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(mockDoc(ownerId));
    await expect(makeService().rejeitarDocumento(docId, gestorId, "")).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException when motivo is whitespace only", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(mockDoc(ownerId));
    await expect(makeService().rejeitarDocumento(docId, gestorId, "   ")).rejects.toThrow(BadRequestException);
  });

  it("rejects document when gestor is different from owner and motivo is valid", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(mockDoc(ownerId));
    const result = await makeService().rejeitarDocumento(docId, gestorId, motivo);
    expect(result).toHaveProperty("status", "REJEITADO");
  });

  it("writes audit log with REJEITADO action and motivo", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(mockDoc(ownerId));

    await makeService().rejeitarDocumento(docId, gestorId, motivo);

    expect(mockPrisma.kycAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ acaoTipo: "REJEITADO", usuarioId: gestorId, motivo }),
      })
    );
  });

  it("notifies document owner after rejection with motivo", async () => {
    mockPrisma.kycDocumento.findUnique.mockResolvedValue(mockDoc(ownerId));

    await makeService().rejeitarDocumento(docId, gestorId, motivo);

    expect(mockNotificacoes.criar).toHaveBeenCalledWith(
      ownerId,
      "KYC_REJEITADO",
      expect.any(String),
      expect.stringContaining(motivo),
      expect.any(String)
    );
  });
});

// ─────────────────────────────────────────────────────────────────
// uploadDocumento — scoped to authenticated user
// ─────────────────────────────────────────────────────────────────
describe("KycService – uploadDocumento", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.kycDocumento.create.mockResolvedValue({
      kycDocumentoId: docId,
      usuarioId: ownerId,
      tipo: "RG",
      url: "https://s3.example.com/rg.jpg",
      status: "PENDENTE",
    });
  });

  it("throws NotFoundException when user does not exist", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    await expect(makeService().uploadDocumento(ownerId, "RG", "https://s3.example.com/rg.jpg")).rejects.toThrow(NotFoundException);
  });

  it("creates document scoped to the requesting user", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ usuarioId: ownerId });

    await makeService().uploadDocumento(ownerId, "RG", "https://s3.example.com/rg.jpg");

    expect(mockPrisma.kycDocumento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ usuarioId: ownerId, status: "PENDENTE" }),
      })
    );
  });
});
