import { NotificacoesService } from "./notificacoes.service";

const mockPrisma = {
  notificacao: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

function makeService() {
  return new NotificacoesService(mockPrisma as any);
}

describe("NotificacoesService — criar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates notification with all fields", async () => {
    const created = { notificacaoId: "n1", usuarioId: "u1", tipo: "KYC_APROVADO", titulo: "KYC", mensagem: "Ok", link: "/kyc" };
    mockPrisma.notificacao.create.mockResolvedValue(created);

    const service = makeService();
    const result = await service.criar("u1", "KYC_APROVADO", "KYC", "Ok", "/kyc");

    expect(result).toEqual(created);
    expect(mockPrisma.notificacao.create).toHaveBeenCalledWith({
      data: { usuarioId: "u1", tipo: "KYC_APROVADO", titulo: "KYC", mensagem: "Ok", link: "/kyc" },
    });
  });

  it("creates notification without optional link", async () => {
    mockPrisma.notificacao.create.mockResolvedValue({ notificacaoId: "n2" });
    const service = makeService();
    await service.criar("u1", "OBRA_CRIADA", "Obra", "Nova obra");
    expect(mockPrisma.notificacao.create).toHaveBeenCalledWith({
      data: { usuarioId: "u1", tipo: "OBRA_CRIADA", titulo: "Obra", mensagem: "Nova obra", link: undefined },
    });
  });
});

describe("NotificacoesService — listar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns paginated notifications", async () => {
    const items = [{ notificacaoId: "n1" }, { notificacaoId: "n2" }];
    mockPrisma.notificacao.findMany.mockResolvedValue(items);
    mockPrisma.notificacao.count.mockResolvedValue(10);

    const service = makeService();
    const result = await service.listar("u1", 2, 0);

    expect(result.notificacoes).toEqual(items);
    expect(result.total).toBe(10);
    expect(mockPrisma.notificacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: "u1" }, take: 2, skip: 0 })
    );
  });

  it("uses default limit and offset", async () => {
    mockPrisma.notificacao.findMany.mockResolvedValue([]);
    mockPrisma.notificacao.count.mockResolvedValue(0);
    const service = makeService();
    await service.listar("u1");
    expect(mockPrisma.notificacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 })
    );
  });
});

describe("NotificacoesService — listarNaoLidas", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns only unread notifications ordered by date desc", async () => {
    const unread = [{ notificacaoId: "n3", lida: false }];
    mockPrisma.notificacao.findMany.mockResolvedValue(unread);
    const service = makeService();
    const result = await service.listarNaoLidas("u1");
    expect(result).toEqual(unread);
    expect(mockPrisma.notificacao.findMany).toHaveBeenCalledWith({
      where: { usuarioId: "u1", lida: false },
      orderBy: { criadoEm: "desc" },
    });
  });
});

describe("NotificacoesService — contarNaoLidas", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns count of unread notifications", async () => {
    mockPrisma.notificacao.count.mockResolvedValue(5);
    const service = makeService();
    const result = await service.contarNaoLidas("u1");
    expect(result).toBe(5);
    expect(mockPrisma.notificacao.count).toHaveBeenCalledWith({ where: { usuarioId: "u1", lida: false } });
  });
});

describe("NotificacoesService — marcarComoLida", () => {
  beforeEach(() => jest.clearAllMocks());

  it("marks single notification as read scoped to user", async () => {
    mockPrisma.notificacao.updateMany.mockResolvedValue({ count: 1 });
    const service = makeService();
    await service.marcarComoLida("u1", "n1");
    expect(mockPrisma.notificacao.updateMany).toHaveBeenCalledWith({
      where: { notificacaoId: "n1", usuarioId: "u1" },
      data: expect.objectContaining({ lida: true, lidoEm: expect.any(Date) }),
    });
  });
});

describe("NotificacoesService — marcarTudasComoLidas", () => {
  beforeEach(() => jest.clearAllMocks());

  it("marks all unread notifications as read for user", async () => {
    mockPrisma.notificacao.updateMany.mockResolvedValue({ count: 3 });
    const service = makeService();
    await service.marcarTudasComoLidas("u1");
    expect(mockPrisma.notificacao.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: "u1", lida: false },
      data: expect.objectContaining({ lida: true, lidoEm: expect.any(Date) }),
    });
  });
});

describe("NotificacoesService — deletar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deletes notification scoped to user", async () => {
    mockPrisma.notificacao.deleteMany.mockResolvedValue({ count: 1 });
    const service = makeService();
    await service.deletar("u1", "n1");
    expect(mockPrisma.notificacao.deleteMany).toHaveBeenCalledWith({
      where: { notificacaoId: "n1", usuarioId: "u1" },
    });
  });
});

describe("NotificacoesService — deletarLidas", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deletes all read notifications for user and returns count", async () => {
    mockPrisma.notificacao.deleteMany.mockResolvedValue({ count: 7 });
    const service = makeService();
    const result = await service.deletarLidas("u1");
    expect((result as any).count).toBe(7);
    expect(mockPrisma.notificacao.deleteMany).toHaveBeenCalledWith({ where: { usuarioId: "u1", lida: true } });
  });
});
