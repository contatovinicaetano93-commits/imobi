import { Test, TestingModule } from "@nestjs/testing";
import { PipelineService } from "./pipeline.service";
import { PrismaService } from "../prisma/prisma.service";

describe("PipelineService", () => {
  let service: PipelineService;

  const prisma = {
    propostaCredito: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    solicitacaoCredito: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findUniqueOrThrow: jest.fn() },
    credito: { findMany: jest.fn(), findFirst: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PipelineService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PipelineService);
    jest.clearAllMocks();
  });

  it("agrega propostas e solicitações sem duplicar por usuário", async () => {
    prisma.propostaCredito.findMany.mockResolvedValue([
      {
        id: "p1",
        tipoCredito: "CREDITO_PONTE",
        nomeEmpreendimento: "Torre A",
        nomeContato: "João",
        email: "j@test.com",
        telefone: "11999999999",
        empresa: null,
        narrativa: null,
        percentualFisico: null,
        status: "RECEBIDA",
        usuarioId: "u1",
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      },
    ]);
    prisma.solicitacaoCredito.findMany.mockResolvedValue([
      {
        solicitacaoId: "s1",
        usuarioId: "u1",
        valorSolicitado: 500000,
        finalidade: "CONSTRUCAO",
        observacoes: null,
        ltv: 0.65,
        status: "PENDENTE",
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        usuario: { nome: "João", email: "j@test.com", usuarioId: "u1" },
        comite: null,
      },
    ]);
    prisma.credito.findMany.mockResolvedValue([]);

    const { items } = await service.listar();

    expect(items).toHaveLength(1);
    expect(items[0]?.fonte).toBe("solicitacao");
    expect(items[0]?.etapa).toBe("estruturacao");
  });

  it("atualiza status da solicitação ao mover para análise", async () => {
    const solicitacao = {
      solicitacaoId: "s1",
      usuarioId: "u1",
      valorSolicitado: 500000,
      finalidade: "CONSTRUCAO",
      observacoes: null,
      ltv: 0.65,
      status: "EM_COMITE" as const,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      usuario: { nome: "João", email: "j@test.com", usuarioId: "u1" },
      comite: { comiteId: "c1", status: "ABERTO", decisao: null },
    };

    prisma.solicitacaoCredito.findUnique.mockResolvedValue(solicitacao);
    prisma.solicitacaoCredito.update.mockResolvedValue({
      ...solicitacao,
      status: "PENDENTE",
    });
    prisma.solicitacaoCredito.findUniqueOrThrow.mockResolvedValue({
      ...solicitacao,
      status: "PENDENTE",
    });
    prisma.credito.findFirst.mockResolvedValue(null);

    await service.atualizarEtapa("solicitacao", "s1", "analise");

    expect(prisma.solicitacaoCredito.update).toHaveBeenCalledWith({
      where: { solicitacaoId: "s1" },
      data: { status: "PENDENTE" },
    });
  });

  it("move solicitação com comitê para EM_COMITE em estruturação", async () => {
    const solicitacao = {
      solicitacaoId: "s2",
      usuarioId: "u2",
      valorSolicitado: 800000,
      finalidade: "CONSTRUCAO",
      observacoes: null,
      ltv: 0.7,
      status: "PENDENTE" as const,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      usuario: { nome: "Maria", email: "m@test.com", usuarioId: "u2" },
      comite: { comiteId: "c2", status: "ABERTO", decisao: null },
    };

    prisma.solicitacaoCredito.findUnique.mockResolvedValue(solicitacao);
    prisma.solicitacaoCredito.update.mockResolvedValue({
      ...solicitacao,
      status: "EM_COMITE",
    });
    prisma.solicitacaoCredito.findUniqueOrThrow.mockResolvedValue({
      ...solicitacao,
      status: "EM_COMITE",
    });
    prisma.credito.findFirst.mockResolvedValue(null);

    await service.atualizarEtapa("solicitacao", "s2", "estruturacao");

    expect(prisma.solicitacaoCredito.update).toHaveBeenCalledWith({
      where: { solicitacaoId: "s2" },
      data: { status: "EM_COMITE" },
    });
  });
});
