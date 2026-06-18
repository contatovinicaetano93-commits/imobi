import { ForbiddenException, NotFoundException } from "@nestjs/common";

jest.mock("@imbobi/core", () => ({
  calcularDistanciaMetros: jest.fn().mockReturnValue(5),
}));

import { EvidenciasService } from "./evidencias.service";

const mockPrisma = {
  etapaObra: {
    findUnique: jest.fn(),
  },
  evidenciaEtapa: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

const mockStorage = {
  upload: jest.fn(),
  getSignedUrl: jest.fn(),
};

describe("EvidenciasService – ownership & RBAC", () => {
  let service: EvidenciasService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EvidenciasService(mockPrisma as any, mockStorage as any);
  });

  // ─── upload ───────────────────────────────────────────────────────────────

  describe("upload", () => {
    const obraOwner = "user-owner";

    const etapaWithObra = {
      etapaId: "etapa-1",
      obra: {
        obraId: "obra-1",
        usuarioId: obraOwner,
        geoLatitude: -23.55,
        geoLongitude: -46.63,
        raioValidacaoMetros: 50,
      },
    };

    const validInput = {
      etapaId: "etapa-1",
      latitude: -23.55,
      longitude: -46.63,
      accuracyMetros: 10,
      timestampCaptura: new Date().toISOString(),
    };

    beforeEach(() => {
      mockPrisma.etapaObra.findUnique.mockResolvedValue(etapaWithObra);
      mockPrisma.$queryRaw.mockResolvedValue([{ dentro: true }]);
      mockStorage.upload.mockResolvedValue({ key: "s3/evidencia.jpg" });
      mockPrisma.evidenciaEtapa.create.mockResolvedValue({ evidenciaId: "ev-1" });
    });

    it("allows the obra owner to upload an evidencia", async () => {
      const result = await service.upload(obraOwner, validInput, Buffer.from("img"), "image/jpeg");
      expect(result).toHaveProperty("evidenciaId");
    });

    it("throws ForbiddenException when a different user tries to upload to an obra they don't own", async () => {
      await expect(
        service.upload("attacker-id", validInput, Buffer.from("img"), "image/jpeg"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException when etapa does not exist", async () => {
      mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
      await expect(
        service.upload(obraOwner, validInput, Buffer.from("img"), "image/jpeg"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when GPS accuracy exceeds limit (>15m)", async () => {
      const { BadRequestException } = await import("@nestjs/common");
      const inputBadGps = { ...validInput, accuracyMetros: 20 };
      await expect(
        service.upload(obraOwner, inputBadGps, Buffer.from("img"), "image/jpeg"),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws ForbiddenException when location is outside geofence", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ dentro: false }]);
      await expect(
        service.upload(obraOwner, validInput, Buffer.from("img"), "image/jpeg"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── listarPorEtapa ───────────────────────────────────────────────────────

  describe("listarPorEtapa", () => {
    const obraOwner = "user-owner";

    const etapaWithObra = {
      etapaId: "etapa-1",
      obra: { usuarioId: obraOwner },
    };

    const evidencias = [{ evidenciaId: "ev-1", fotoUrl: "s3/photo.jpg" }];

    beforeEach(() => {
      mockPrisma.etapaObra.findUnique.mockResolvedValue(etapaWithObra);
      mockPrisma.evidenciaEtapa.findMany.mockResolvedValue(evidencias);
      mockStorage.getSignedUrl.mockResolvedValue("https://signed.url/photo.jpg");
    });

    it("allows the obra owner to list evidencias", async () => {
      const result = await service.listarPorEtapa({ id: obraOwner, tipo: "TOMADOR" }, "etapa-1");
      expect(result).toHaveLength(1);
    });

    it("allows ADMIN to list evidencias of any etapa", async () => {
      const result = await service.listarPorEtapa({ id: "admin-id", tipo: "ADMIN" }, "etapa-1");
      expect(result).toHaveLength(1);
    });

    it("allows GESTOR to list evidencias of any etapa", async () => {
      const result = await service.listarPorEtapa({ id: "gestor-id", tipo: "GESTOR" }, "etapa-1");
      expect(result).toHaveLength(1);
    });

    it("throws ForbiddenException when a non-owner TOMADOR tries to list evidencias", async () => {
      await expect(
        service.listarPorEtapa({ id: "attacker-id", tipo: "TOMADOR" }, "etapa-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException when etapa does not exist", async () => {
      mockPrisma.etapaObra.findUnique.mockResolvedValue(null);
      await expect(
        service.listarPorEtapa({ id: obraOwner, tipo: "TOMADOR" }, "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("generates fresh signed URLs for each evidencia photo", async () => {
      await service.listarPorEtapa({ id: obraOwner, tipo: "TOMADOR" }, "etapa-1");
      expect(mockStorage.getSignedUrl).toHaveBeenCalledWith("s3/photo.jpg");
    });
  });

  // ─── validar ──────────────────────────────────────────────────────────────

  describe("validar", () => {
    const evidenciaRecord = { evidenciaId: "ev-1", validada: false };

    beforeEach(() => {
      mockPrisma.evidenciaEtapa.findUnique.mockResolvedValue(evidenciaRecord);
      mockPrisma.evidenciaEtapa.update.mockResolvedValue({ ...evidenciaRecord, validada: true });
    });

    it("allows GESTOR to validate an evidencia", async () => {
      await expect(
        service.validar({ id: "gestor-id", tipo: "GESTOR" }, "ev-1", true),
      ).resolves.toBeDefined();
    });

    it("allows ADMIN to validate an evidencia", async () => {
      await expect(
        service.validar({ id: "admin-id", tipo: "ADMIN" }, "ev-1", true),
      ).resolves.toBeDefined();
    });

    it("allows ENGENHEIRO to validate an evidencia (after bug fix)", async () => {
      await expect(
        service.validar({ id: "eng-id", tipo: "ENGENHEIRO" }, "ev-1", true),
      ).resolves.toBeDefined();
    });

    it("throws ForbiddenException when TOMADOR tries to validate", async () => {
      await expect(
        service.validar({ id: "user-id", tipo: "TOMADOR" }, "ev-1", true),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws ForbiddenException when COMERCIAL tries to validate", async () => {
      await expect(
        service.validar({ id: "comercial-id", tipo: "COMERCIAL" }, "ev-1", true),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException when evidencia does not exist", async () => {
      mockPrisma.evidenciaEtapa.findUnique.mockResolvedValue(null);
      await expect(
        service.validar({ id: "gestor-id", tipo: "GESTOR" }, "nonexistent", true),
      ).rejects.toThrow(NotFoundException);
    });

    it("can reject (aprovado=false) an evidencia", async () => {
      mockPrisma.evidenciaEtapa.update.mockResolvedValue({ ...evidenciaRecord, validada: false });
      const result = await service.validar({ id: "admin-id", tipo: "ADMIN" }, "ev-1", false, "Foto fora de foco");
      expect(mockPrisma.evidenciaEtapa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ validada: false }),
        }),
      );
    });
  });
});
