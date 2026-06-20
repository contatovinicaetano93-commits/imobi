import { Test, TestingModule } from "@nestjs/testing";
import { ComercialService } from "./comercial.service";
import { PrismaService } from "../prisma/prisma.service";
import { ConversionScoringService } from "./conversion-scoring.service";

const FAKE_STAGE = { stageId: "stage-1", nome: "PROSPECÇÃO", ordem: 1 };
const FAKE_LEAD  = { leadId: "lead-abc" };

function makePrisma() {
  return {
    pipelineStage: {
      findFirst:  jest.fn().mockResolvedValue(FAKE_STAGE),
      create:     jest.fn().mockResolvedValue(FAKE_STAGE),
    },
    lead: {
      create: jest.fn().mockResolvedValue(FAKE_LEAD),
    },
  };
}

describe("ComercialService.capturaPublica", () => {
  let service: ComercialService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComercialService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConversionScoringService, useValue: { calcularScore: jest.fn() } },
      ],
    }).compile();

    service = module.get(ComercialService);
  });

  it("cria lead com campos obrigatórios e usa stage existente", async () => {
    const result = await service.capturaPublica({
      clienteNome: "João Silva",
      clienteEmail: "joao@silva.com",
      clienteTelefone: "11999998888",
    });

    expect(result).toEqual(FAKE_LEAD);
    expect(prisma.pipelineStage.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.pipelineStage.create).not.toHaveBeenCalled();
    expect(prisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clienteNome: "João Silva",
          clienteEmail: "joao@silva.com",
          clienteTelefone: "11999998888",
          fonte: "WEBSITE",
          segmentoCliente: "NOVO",
          stageId: FAKE_STAGE.stageId,
        }),
      }),
    );
  });

  it("cria stage padrão quando não existe nenhum", async () => {
    prisma.pipelineStage.findFirst.mockResolvedValueOnce(null);

    await service.capturaPublica({
      clienteNome: "Maria",
      clienteEmail: "maria@x.com",
      clienteTelefone: "11888887777",
    });

    expect(prisma.pipelineStage.create).toHaveBeenCalledTimes(1);
  });

  it("concatena campos extras em condicoes", async () => {
    await service.capturaPublica({
      clienteNome: "Carlos",
      clienteEmail: "carlos@c.com",
      clienteTelefone: "11777776666",
      empresa: "Construtora ABC",
      cargo: "Diretor",
      volume: "10M",
      observacoes: "Projeto residencial",
    });

    const createCall = prisma.lead.create.mock.calls[0][0];
    expect(createCall.data.condicoes).toContain("Construtora ABC");
    expect(createCall.data.condicoes).toContain("Diretor");
    expect(createCall.data.condicoes).toContain("10M");
    expect(createCall.data.condicoes).toContain("Projeto residencial");
  });

  it("condicoes é null quando sem campos extras", async () => {
    await service.capturaPublica({
      clienteNome: "Ana",
      clienteEmail: "ana@a.com",
      clienteTelefone: "11666665555",
    });

    const createCall = prisma.lead.create.mock.calls[0][0];
    expect(createCall.data.condicoes).toBeNull();
  });
});
