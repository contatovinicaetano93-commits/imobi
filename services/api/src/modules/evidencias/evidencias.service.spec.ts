import { ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { EvidenciasService } from "./evidencias.service";

const FAKE_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const ETAPA_ID = "etapa-uuid-001";
const OBRA_ID = "obra-uuid-001";
const USUARIO_ID = "user-uuid-001";
const OUTRO_ID = "user-uuid-002";
const EVIDENCIA_ID = "ev-uuid-001";

const baseEtapa = {
  etapaId: ETAPA_ID,
  obra: {
    obraId: OBRA_ID,
    usuarioId: USUARIO_ID,
    geoLatitude: -23.55,
    geoLongitude: -46.63,
    raioValidacaoMetros: 100,
  },
};

function makeInput(overrides = {}) {
  return {
    etapaId: ETAPA_ID,
    latitude: -23.55,
    longitude: -46.63,
    accuracyMetros: 10,
    timestampCaptura: new Date().toISOString(),
    descricao: undefined,
    ...overrides,
  } as any;
}

function buildService(overrides: { etapa?: any; dentro?: boolean; uploadKey?: string } = {}) {
  const etapa = overrides.etapa !== undefined ? overrides.etapa : baseEtapa;
  const dentro = overrides.dentro !== undefined ? overrides.dentro : true;
  const key = overrides.uploadKey ?? "evidencias/etapa-uuid-001/abc-123";

  const prisma = {
    etapaObra: {
      findUnique: jest.fn().mockResolvedValue(etapa),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ dentro }]),
    evidenciaEtapa: {
      create: jest.fn().mockResolvedValue({
        evidenciaId: "ev-001",
        etapaId: ETAPA_ID,
        obraId: OBRA_ID,
        fotoUrl: key,
        validada: false,
      }),
    },
  } as any;

  const storage = {
    upload: jest.fn().mockResolvedValue({ key, url: "https://s3.test/signed-url" }),
    getSignedUrl: jest.fn().mockResolvedValue("https://s3.test/signed-url"),
  } as any;

  const service = new EvidenciasService(prisma, storage);
  return { service, prisma, storage };
}

const GESTOR = { id: "gestor-uuid-001", tipo: "GESTOR_OBRA" };
const ENGENHEIRO = { id: USUARIO_ID, tipo: "ENGENHEIRO" };

function buildValidarService(opts: { evidencia?: any; updateManyCount?: number } = {}) {
  const evidencia =
    opts.evidencia !== undefined ? opts.evidencia : { evidenciaId: EVIDENCIA_ID, validada: false };
  const updateManyCount = opts.updateManyCount ?? 1;

  const updatedEvidencia = {
    evidenciaId: EVIDENCIA_ID,
    validada: true,
    etapaId: ETAPA_ID,
    obraId: OBRA_ID,
    observacao: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };

  const prisma = {
    evidenciaEtapa: {
      findUnique: jest
        .fn()
        .mockResolvedValueOnce(evidencia)
        .mockResolvedValueOnce(updatedEvidencia),
      updateMany: jest.fn().mockResolvedValue({ count: updateManyCount }),
    },
  } as any;

  const storage = { upload: jest.fn(), getSignedUrl: jest.fn() } as any;

  const service = new EvidenciasService(prisma, storage);
  return { service, prisma };
}

describe("EvidenciasService.upload — Bug 9: buffer real deve chegar ao S3", () => {
  it("passa o buffer real (não vazio) para storage.upload", async () => {
    const { service, storage } = buildService();
    await service.upload(USUARIO_ID, makeInput(), FAKE_JPEG, "image/jpeg");

    expect(storage.upload).toHaveBeenCalledTimes(1);
    const [buffer, mimeType] = storage.upload.mock.calls[0];
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer).toEqual(FAKE_JPEG);
    expect(mimeType).toBe("image/jpeg");
  });

  it("armazena a S3 key no banco, não a URL pré-assinada", async () => {
    const key = "evidencias/etapa-uuid-001/unique-key";
    const { service, prisma } = buildService({ uploadKey: key });

    await service.upload(USUARIO_ID, makeInput(), FAKE_JPEG, "image/jpeg");

    const createCall = prisma.evidenciaEtapa.create.mock.calls[0][0];
    expect(createCall.data.fotoUrl).toBe(key);
    expect(createCall.data.fotoUrl).not.toMatch(/^https?:\/\//);
  });

  it("associa a evidência à etapa e obra corretas", async () => {
    const { service, prisma } = buildService();

    await service.upload(USUARIO_ID, makeInput(), FAKE_JPEG, "image/jpeg");

    const createCall = prisma.evidenciaEtapa.create.mock.calls[0][0];
    expect(createCall.data.etapaId).toBe(ETAPA_ID);
    expect(createCall.data.obraId).toBe(OBRA_ID);
  });

  it("persiste coordenadas GPS e accuracy no banco", async () => {
    const { service, prisma } = buildService();
    const input = makeInput({ latitude: -23.551, longitude: -46.631, accuracyMetros: 7 });

    await service.upload(USUARIO_ID, input, FAKE_JPEG, "image/jpeg");

    const createCall = prisma.evidenciaEtapa.create.mock.calls[0][0];
    expect(createCall.data.latCaptura).toBe(-23.551);
    expect(createCall.data.lngCaptura).toBe(-46.631);
    expect(createCall.data.accuracyMetros).toBe(7);
  });
});

describe("EvidenciasService.upload — validações de negócio", () => {
  it("lança NotFoundException se etapa não existe", async () => {
    const { service } = buildService({ etapa: null });
    await expect(service.upload(USUARIO_ID, makeInput(), FAKE_JPEG, "image/jpeg")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("lança ForbiddenException se usuário não é dono da obra", async () => {
    const { service } = buildService();
    await expect(service.upload(OUTRO_ID, makeInput(), FAKE_JPEG, "image/jpeg")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("lança BadRequestException se accuracy > 15m", async () => {
    const { service } = buildService();
    const input = makeInput({ accuracyMetros: 16 });
    await expect(service.upload(USUARIO_ID, input, FAKE_JPEG, "image/jpeg")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("lança ForbiddenException se coordenadas fora do raio (PostGIS retorna dentro=false)", async () => {
    const { service } = buildService({ dentro: false });
    await expect(service.upload(USUARIO_ID, makeInput(), FAKE_JPEG, "image/jpeg")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("NÃO chama storage.upload se GPS fora do raio", async () => {
    const { service, storage } = buildService({ dentro: false });
    await expect(service.upload(USUARIO_ID, makeInput(), FAKE_JPEG, "image/jpeg")).rejects.toThrow();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("NÃO persiste no banco se storage.upload falha", async () => {
    const { service, storage, prisma } = buildService();
    storage.upload.mockRejectedValueOnce(new Error("S3 unavailable"));

    await expect(service.upload(USUARIO_ID, makeInput(), FAKE_JPEG, "image/jpeg")).rejects.toThrow(
      "S3 unavailable",
    );
    expect(prisma.evidenciaEtapa.create).not.toHaveBeenCalled();
  });
});

describe("EvidenciasService.validar — estado máquina e race condition", () => {
  it("lança ForbiddenException se usuário não é GESTOR_OBRA nem ADMIN", async () => {
    const { service } = buildValidarService();
    await expect(service.validar(ENGENHEIRO, EVIDENCIA_ID, true)).rejects.toThrow(ForbiddenException);
  });

  it("lança NotFoundException se evidência não existe", async () => {
    const { service } = buildValidarService({ evidencia: null });
    await expect(service.validar(GESTOR, EVIDENCIA_ID, true)).rejects.toThrow(NotFoundException);
  });

  it("lança BadRequestException ao tentar aprovar evidência já aprovada", async () => {
    const { service } = buildValidarService({
      evidencia: { evidenciaId: EVIDENCIA_ID, validada: true },
    });
    await expect(service.validar(GESTOR, EVIDENCIA_ID, true)).rejects.toThrow(BadRequestException);
  });

  it("lança BadRequestException ao tentar reverter evidência já aprovada", async () => {
    const { service } = buildValidarService({
      evidencia: { evidenciaId: EVIDENCIA_ID, validada: true },
    });
    await expect(service.validar(GESTOR, EVIDENCIA_ID, false)).rejects.toThrow(BadRequestException);
  });

  it("usa updateMany com where validada:false para prevenir race condition", async () => {
    const { service, prisma } = buildValidarService();
    await service.validar(GESTOR, EVIDENCIA_ID, true);
    expect(prisma.evidenciaEtapa.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ evidenciaId: EVIDENCIA_ID, validada: false }),
      }),
    );
  });

  it("lança BadRequestException se updateMany não atualiza nenhum registro (race condition ganhou)", async () => {
    const { service } = buildValidarService({ updateManyCount: 0 });
    await expect(service.validar(GESTOR, EVIDENCIA_ID, true)).rejects.toThrow(BadRequestException);
  });
});
