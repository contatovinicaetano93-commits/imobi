import { NotFoundException, BadRequestException } from "@nestjs/common";
import { ComiteService } from "./comite.service";

const mockPrisma = {
  solicitacaoCredito: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  comiteDigital: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  votoComite: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  usuario: { count: jest.fn() },
  credito: { create: jest.fn() },
  obra: { update: jest.fn() },
  $transaction: jest.fn((cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma)),
};

const mockNotificacoes = { criar: jest.fn().mockResolvedValue({}) };
const mockEmailQueue = { etapaAprovada: jest.fn().mockResolvedValue({}) };

function makeService() {
  return new ComiteService(mockPrisma as any, mockNotificacoes as any, mockEmailQueue as any);
}

describe("ComiteService — calcularRating (via submeterSolicitacao)", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    [50, "A"],
    [65, "B"],
    [75, "C"],
    [76, "D"],
  ])("ltv=%i → rating=%s", async (ltv, expectedRating) => {
    mockPrisma.solicitacaoCredito.create.mockResolvedValue({
      solicitacaoId: "s1",
      usuarioId: "u1",
      ratingCalculado: expectedRating,
    });
    mockPrisma.comiteDigital.create.mockResolvedValue({});
    mockPrisma.solicitacaoCredito.update.mockResolvedValue({});

    const service = makeService();
    const result = await service.submeterSolicitacao("u1", {
      valorSolicitado: 100000,
      prazoMeses: 12,
      taxaMensal: 1.5,
      finalidade: "Obra",
      ltv,
    });

    expect(mockPrisma.solicitacaoCredito.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ratingCalculado: expectedRating }) })
    );
    expect(mockPrisma.comiteDigital.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ABERTO" }) })
    );
  });
});

describe("ComiteService — submeterParecer", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when comite not found", async () => {
    mockPrisma.comiteDigital.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.submeterParecer("c1", "eng1", "Parecer ok")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when comite is ENCERRADO", async () => {
    mockPrisma.comiteDigital.findUnique.mockResolvedValue({ comiteId: "c1", status: "ENCERRADO", parecerTecnico: null });
    const service = makeService();
    await expect(service.submeterParecer("c1", "eng1", "Parecer ok")).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException when parecer already registered", async () => {
    mockPrisma.comiteDigital.findUnique.mockResolvedValue({ comiteId: "c1", status: "ABERTO", parecerTecnico: "Já existe" });
    const service = makeService();
    await expect(service.submeterParecer("c1", "eng1", "Novo parecer")).rejects.toThrow(BadRequestException);
  });

  it("updates comite to EM_VOTACAO and stores parecer", async () => {
    mockPrisma.comiteDigital.findUnique.mockResolvedValue({ comiteId: "c1", status: "ABERTO", parecerTecnico: null });
    mockPrisma.comiteDigital.update.mockResolvedValue({ comiteId: "c1", status: "EM_VOTACAO" });
    const service = makeService();
    await service.submeterParecer("c1", "eng1", "Parecer técnico detalhado");
    expect(mockPrisma.comiteDigital.update).toHaveBeenCalledWith({
      where: { comiteId: "c1" },
      data: expect.objectContaining({ parecerTecnico: "Parecer técnico detalhado", status: "EM_VOTACAO", parecerEngId: "eng1" }),
    });
  });
});

describe("ComiteService — votar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when comite not found", async () => {
    mockPrisma.comiteDigital.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.votar("c1", "admin1", "APROVAR")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when comite is ENCERRADO", async () => {
    mockPrisma.comiteDigital.findUnique.mockResolvedValue({ comiteId: "c1", status: "ENCERRADO", votos: [] });
    const service = makeService();
    await expect(service.votar("c1", "admin1", "APROVAR")).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException when user already voted", async () => {
    mockPrisma.comiteDigital.findUnique.mockResolvedValue({
      comiteId: "c1",
      status: "EM_VOTACAO",
      votos: [{ votanteId: "admin1", voto: "APROVAR" }],
    });
    const service = makeService();
    await expect(service.votar("c1", "admin1", "APROVAR")).rejects.toThrow(BadRequestException);
  });

  it("registers vote and returns vote count", async () => {
    mockPrisma.comiteDigital.findUnique.mockResolvedValue({ comiteId: "c1", status: "EM_VOTACAO", votos: [] });
    mockPrisma.votoComite.create.mockResolvedValue({});
    mockPrisma.votoComite.findMany.mockResolvedValue([{ voto: "APROVAR" }]);
    mockPrisma.usuario.count.mockResolvedValue(3);

    const service = makeService();
    const result = await service.votar("c1", "admin1", "APROVAR", "Excelente projeto");

    expect(mockPrisma.votoComite.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ comiteId: "c1", votanteId: "admin1", voto: "APROVAR" }),
    });
    expect(result.totalVotos).toBe(1);
    expect(result.quorum).toBe(2);
  });

  it("auto-closes and approves when quorum reached with majority APROVAR", async () => {
    mockPrisma.comiteDigital.findUnique.mockResolvedValue({ comiteId: "c1", status: "EM_VOTACAO", votos: [] });
    mockPrisma.votoComite.create.mockResolvedValue({});
    mockPrisma.votoComite.findMany.mockResolvedValue([
      { voto: "APROVAR" }, { voto: "APROVAR" },
    ]);
    mockPrisma.usuario.count.mockResolvedValue(2);
    mockPrisma.comiteDigital.update.mockResolvedValue({
      comiteId: "c1",
      solicitacaoId: "s1",
      decisao: "APROVADO",
      solicitacao: {
        usuarioId: "u1",
        valorSolicitado: 100000,
        taxaMensal: 1.5,
        prazoMeses: 12,
        usuario: { usuarioId: "u1", nome: "Tomador Teste", email: "tomador@test.com" },
      },
    });
    mockPrisma.solicitacaoCredito.update.mockResolvedValue({});
    mockPrisma.credito.create.mockResolvedValue({});

    const service = makeService();
    await service.votar("c1", "admin2", "APROVAR");

    expect(mockPrisma.comiteDigital.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ENCERRADO", decisao: "APROVADO" }) })
    );
    expect(mockPrisma.credito.create).toHaveBeenCalled();
  });
});

describe("ComiteService — getDossie", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when comite not found", async () => {
    mockPrisma.comiteDigital.findUnique.mockResolvedValue(null);
    const service = makeService();
    await expect(service.getDossie("nonexistent")).rejects.toThrow(NotFoundException);
  });

  it("returns comite with full details", async () => {
    const comite = { comiteId: "c1", status: "ABERTO", solicitacao: {}, votos: [] };
    mockPrisma.comiteDigital.findUnique.mockResolvedValue(comite);
    const service = makeService();
    const result = await service.getDossie("c1");
    expect(result).toEqual(comite);
  });
});
