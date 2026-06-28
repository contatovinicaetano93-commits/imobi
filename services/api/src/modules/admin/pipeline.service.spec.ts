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
});
