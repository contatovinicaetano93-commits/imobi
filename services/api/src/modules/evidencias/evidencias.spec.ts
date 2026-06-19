import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { EvidenciasService } from "./evidencias.service";

jest.mock("@imbobi/core", () => ({
  calcularDistanciaMetros: jest.fn().mockReturnValue(5),
}));

const mockPrisma = {
  etapaObra: { findUnique: jest.fn() },
  evidenciaEtapa: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  $queryRaw: jest.fn(),
};

const mockStorage = {
  upload: jest.fn(),
  getSignedUrl: jest.fn(),
};

function makeService() {
  return new EvidenciasService(mockPrisma as any, mockStorage as any);
}

function makeEtapa(obraOverrides: Record<string, any> = {}) {
  return {
    etapaId: "e1",
    obra: {
      obraId: "o1",
      usuarioId: "u1",
      geoLatitude: -23.5,
      geoLongitude: -46.6,
      raioValidacaoMetros: 50,
      ...obraOverrides,
    },
  };
}

const validInput = {
  etapaId: "e1",
  latitude: -23.5,
  longitude: -46.6,
  accuracyMetros: 10,
  descricao: "Foto da fundação",
};

describe("EvidenciasService — upload", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.upload("u1", validInput, Buffer.from(""), "image/jpeg")).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when user doesn't own the obra", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa({ usuarioId: "other" }));
    const svc = makeService();
    await expect(svc.upload("u1", validInput, Buffer.from(""), "image/jpeg")).rejects.toThrow(ForbiddenException);
  });

  it("throws BadRequestException when GPS accuracy exceeds 15m", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    const svc = makeService();
    await expect(
      svc.upload("u1", { ...validInput, accuracyMetros: 20 }, Buffer.from(""), "image/jpeg"),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws ForbiddenException when location is outside geofence", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    mockPrisma.$queryRaw.mockResolvedValue([{ dentro: false }]);
    const svc = makeService();
    await expect(svc.upload("u1", validInput, Buffer.from(""), "image/jpeg")).rejects.toThrow(ForbiddenException);
  });

  it("stores S3 key (not URL) and creates evidencia when inside geofence", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(makeEtapa());
    mockPrisma.$queryRaw.mockResolvedValue([{ dentro: true }]);
    mockStorage.upload.mockResolvedValue({ key: "evidencias/e1/uuid", url: "https://s3.example.com/presigned" });
    mockPrisma.evidenciaEtapa.create.mockResolvedValue({ evidenciaId: "ev1" });
    const svc = makeService();
    await svc.upload("u1", validInput, Buffer.from("img"), "image/jpeg");
    const createData = mockPrisma.evidenciaEtapa.create.mock.calls[0][0].data;
    expect(createData.fotoUrl).toBe("evidencias/e1/uuid"); // key, not presigned URL
    expect(createData.etapaId).toBe("e1");
    expect(createData.obraId).toBe("o1");
  });
});

describe("EvidenciasService — listarPorEtapa", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when etapa not found", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.listarPorEtapa({ id: "u1", tipo: "TOMADOR" }, "e1")).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when TOMADOR accesses another user's etapa", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue({ etapaId: "e1", obra: { usuarioId: "other" } });
    const svc = makeService();
    await expect(svc.listarPorEtapa({ id: "u1", tipo: "TOMADOR" }, "e1")).rejects.toThrow(ForbiddenException);
  });

  it("allows GESTOR to access any etapa and returns signed URLs", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue({ etapaId: "e1", obra: { usuarioId: "other" } });
    mockPrisma.evidenciaEtapa.findMany.mockResolvedValue([{ evidenciaId: "ev1", fotoUrl: "key1" }]);
    mockStorage.getSignedUrl.mockResolvedValue("https://signed.url/key1");
    const svc = makeService();
    const result = await svc.listarPorEtapa({ id: "g1", tipo: "GESTOR" }, "e1");
    expect(result[0].fotoUrl).toBe("https://signed.url/key1");
  });

  it("generates signed URLs for all evidencias", async () => {
    mockPrisma.etapaObra.findUnique.mockResolvedValue({ etapaId: "e1", obra: { usuarioId: "u1" } });
    mockPrisma.evidenciaEtapa.findMany.mockResolvedValue([
      { evidenciaId: "ev1", fotoUrl: "key1" },
      { evidenciaId: "ev2", fotoUrl: "key2" },
    ]);
    mockStorage.getSignedUrl
      .mockResolvedValueOnce("https://url1")
      .mockResolvedValueOnce("https://url2");
    const svc = makeService();
    const result = await svc.listarPorEtapa({ id: "u1", tipo: "TOMADOR" }, "e1");
    expect(result).toHaveLength(2);
    expect(result[0].fotoUrl).toBe("https://url1");
    expect(result[1].fotoUrl).toBe("https://url2");
  });
});

describe("EvidenciasService — validar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws ForbiddenException when TOMADOR tries to validate", async () => {
    const svc = makeService();
    await expect(svc.validar({ id: "u1", tipo: "TOMADOR" }, "ev1", true)).rejects.toThrow(ForbiddenException);
  });

  it("throws NotFoundException when evidencia not found", async () => {
    mockPrisma.evidenciaEtapa.findUnique.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.validar({ id: "g1", tipo: "GESTOR" }, "ev1", true)).rejects.toThrow(NotFoundException);
  });

  it("updates validada and observacao on success", async () => {
    mockPrisma.evidenciaEtapa.findUnique.mockResolvedValue({ evidenciaId: "ev1" });
    mockPrisma.evidenciaEtapa.update.mockResolvedValue({ evidenciaId: "ev1", validada: true });
    const svc = makeService();
    await svc.validar({ id: "g1", tipo: "GESTOR" }, "ev1", true, "Aprovado");
    expect(mockPrisma.evidenciaEtapa.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { evidenciaId: "ev1" }, data: { validada: true, observacao: "Aprovado" } }),
    );
  });

  it("allows ENGENHEIRO to validate evidencias", async () => {
    mockPrisma.evidenciaEtapa.findUnique.mockResolvedValue({ evidenciaId: "ev1" });
    mockPrisma.evidenciaEtapa.update.mockResolvedValue({ evidenciaId: "ev1", validada: false });
    const svc = makeService();
    await svc.validar({ id: "eng1", tipo: "ENGENHEIRO" }, "ev1", false, "Reprovado");
    expect(mockPrisma.evidenciaEtapa.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { validada: false, observacao: "Reprovado" } }),
    );
  });
});
