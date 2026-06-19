import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { DocumentosService } from "./documentos.service";

const mockPrisma = {
  obra: { findUnique: jest.fn() },
  documento: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockStorage = {
  upload: jest.fn(),
  delete: jest.fn(),
};

function makeService() {
  return new DocumentosService(mockPrisma as any, mockStorage as any);
}

function makeDoc(overrides: Record<string, any> = {}) {
  return {
    documentoId: "d1",
    usuarioId: "u1",
    obraId: null,
    tipo: "CONTRATO",
    nome: "contrato.pdf",
    url: "uploads/key.pdf",
    mimeType: "application/pdf",
    tamanhoBytes: 1024,
    criadoEm: new Date(),
    ...overrides,
  };
}

describe("DocumentosService — upload", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uploads without obraId (user doc)", async () => {
    mockStorage.upload.mockResolvedValue({ key: "uploads/abc.pdf" });
    mockPrisma.documento.create.mockResolvedValue(makeDoc());

    const svc = makeService();
    const buf = Buffer.from("pdf");
    await svc.upload("u1", buf, "application/pdf", "file.pdf", "CONTRATO");

    expect(mockPrisma.obra.findUnique).not.toHaveBeenCalled();
    expect(mockStorage.upload).toHaveBeenCalledWith(buf, "application/pdf", "u1");
    expect(mockPrisma.documento.create).toHaveBeenCalled();
  });

  it("uploads with obraId (validates obra exists)", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue({ obraId: "o1" });
    mockStorage.upload.mockResolvedValue({ key: "uploads/abc.pdf" });
    mockPrisma.documento.create.mockResolvedValue(makeDoc({ obraId: "o1" }));

    const svc = makeService();
    await svc.upload("u1", Buffer.from("pdf"), "application/pdf", "file.pdf", "CONTRATO", "o1");

    expect(mockPrisma.obra.findUnique).toHaveBeenCalledWith({ where: { obraId: "o1" } });
  });

  it("throws NotFoundException when obraId does not exist", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(
      svc.upload("u1", Buffer.from("pdf"), "application/pdf", "file.pdf", "CONTRATO", "invalid-obra"),
    ).rejects.toThrow(NotFoundException);
    expect(mockStorage.upload).not.toHaveBeenCalled();
  });

  it("stores vencimento as Date when provided", async () => {
    mockStorage.upload.mockResolvedValue({ key: "uploads/abc.pdf" });
    mockPrisma.documento.create.mockResolvedValue(makeDoc());

    const svc = makeService();
    await svc.upload("u1", Buffer.from("pdf"), "application/pdf", "file.pdf", "CONTRATO", undefined, "desc", "2025-12-31");

    const createCall = mockPrisma.documento.create.mock.calls[0][0];
    expect(createCall.data.vencimento).toBeInstanceOf(Date);
  });
});

describe("DocumentosService — listarPorObra", () => {
  beforeEach(() => jest.clearAllMocks());

  it("admin bypasses ownership check", async () => {
    mockPrisma.documento.findMany.mockResolvedValue([makeDoc({ obraId: "o1" })]);
    const svc = makeService();
    const result = await svc.listarPorObra("o1", "admin-id", true);
    expect(mockPrisma.obra.findUnique).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("non-admin gets NotFoundException for unknown obra", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.listarPorObra("bad-obra", "u1", false)).rejects.toThrow(NotFoundException);
  });

  it("non-admin gets ForbiddenException for obra they don't own", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue({ obraId: "o1", usuarioId: "other" });
    const svc = makeService();
    await expect(svc.listarPorObra("o1", "u1", false)).rejects.toThrow(ForbiddenException);
  });

  it("returns docs ordered by criadoEm desc for obra owner", async () => {
    mockPrisma.obra.findUnique.mockResolvedValue({ obraId: "o1", usuarioId: "u1" });
    mockPrisma.documento.findMany.mockResolvedValue([makeDoc()]);
    const svc = makeService();
    const result = await svc.listarPorObra("o1", "u1", false);
    expect(result).toHaveLength(1);
    expect(mockPrisma.documento.findMany).toHaveBeenCalledWith({
      where: { obraId: "o1" },
      orderBy: { criadoEm: "desc" },
    });
  });
});

describe("DocumentosService — listarPorUsuario", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns documents scoped to user", async () => {
    mockPrisma.documento.findMany.mockResolvedValue([makeDoc(), makeDoc({ documentoId: "d2" })]);
    const svc = makeService();
    const result = await svc.listarPorUsuario("u1");
    expect(mockPrisma.documento.findMany).toHaveBeenCalledWith({
      where: { usuarioId: "u1" },
      orderBy: { criadoEm: "desc" },
    });
    expect(result).toHaveLength(2);
  });
});

describe("DocumentosService — deletar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when document not found", async () => {
    mockPrisma.documento.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.deletar("bad-id", "u1", false)).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when non-admin tries to delete other user's doc", async () => {
    mockPrisma.documento.findUnique.mockResolvedValue(makeDoc({ usuarioId: "other" }));
    const svc = makeService();
    await expect(svc.deletar("d1", "u1", false)).rejects.toThrow(ForbiddenException);
  });

  it("owner can delete their document", async () => {
    mockPrisma.documento.findUnique.mockResolvedValue(makeDoc());
    mockStorage.delete.mockResolvedValue(undefined);
    mockPrisma.documento.delete.mockResolvedValue(makeDoc());
    const svc = makeService();
    await svc.deletar("d1", "u1", false);
    expect(mockStorage.delete).toHaveBeenCalledWith("uploads/key.pdf");
    expect(mockPrisma.documento.delete).toHaveBeenCalledWith({ where: { documentoId: "d1" } });
  });

  it("admin can delete any document", async () => {
    mockPrisma.documento.findUnique.mockResolvedValue(makeDoc({ usuarioId: "some-other-user" }));
    mockStorage.delete.mockResolvedValue(undefined);
    mockPrisma.documento.delete.mockResolvedValue(makeDoc());
    const svc = makeService();
    await svc.deletar("d1", "admin-id", true);
    expect(mockPrisma.documento.delete).toHaveBeenCalled();
  });

  it("ignores storage.delete errors (soft-failure)", async () => {
    mockPrisma.documento.findUnique.mockResolvedValue(makeDoc());
    mockStorage.delete.mockRejectedValue(new Error("S3 error"));
    mockPrisma.documento.delete.mockResolvedValue(makeDoc());
    const svc = makeService();
    await expect(svc.deletar("d1", "u1", false)).resolves.not.toThrow();
    expect(mockPrisma.documento.delete).toHaveBeenCalled();
  });
});
