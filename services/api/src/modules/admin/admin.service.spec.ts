import { Test, TestingModule } from "@nestjs/testing";
import { AdminService } from "./admin.service";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";

describe("AdminService", () => {
  let service: AdminService;

  const prisma = {
    kycDocumento: { count: jest.fn() },
    dueDiligence: { count: jest.fn(), findMany: jest.fn() },
    obra: { count: jest.fn(), findMany: jest.fn() },
    liberacaoParcela: { count: jest.fn() },
    etapaObra: { count: jest.fn() },
    usuario: { findMany: jest.fn() },
    documento: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: {} },
        { provide: NotificacoesService, useValue: {} },
      ],
    }).compile();

    service = module.get(AdminService);
    jest.clearAllMocks();
  });

  describe("filas", () => {
    it("returns queue counts", async () => {
      prisma.kycDocumento.count.mockResolvedValue(3);
      prisma.dueDiligence.count.mockResolvedValue(2);
      prisma.obra.count.mockResolvedValue(1);
      prisma.liberacaoParcela.count.mockResolvedValue(4);
      prisma.etapaObra.count.mockResolvedValue(5);

      const result = await service.filas();

      expect(result.kycPendentes).toBe(3);
      expect(result.viabilidadePendentes).toBe(2);
      expect(result.obrasAguardandoHomologacao).toBe(1);
      expect(result.liberacoesAguardandoPagamento).toBe(4);
      expect(result.etapasAguardandoVistoria).toBe(5);
      expect(result.atualizadoEm).toBeDefined();
    });
  });

  describe("buscar", () => {
    it("returns empty for short query", async () => {
      const result = await service.buscar("a");
      expect(result.total).toBe(0);
      expect(result.resultados).toEqual([]);
    });

    it("merges results from all entity types", async () => {
      prisma.usuario.findMany.mockResolvedValue([
        {
          usuarioId: "u1",
          nome: "Maria",
          email: "maria@test.com",
          tipo: "TOMADOR",
          criadoEm: new Date("2026-06-01"),
        },
      ]);
      prisma.obra.findMany.mockResolvedValue([]);
      prisma.dueDiligence.findMany.mockResolvedValue([]);
      prisma.documento.findMany.mockResolvedValue([]);

      const result = await service.buscar("maria", 20);

      expect(result.total).toBe(1);
      expect(result.resultados[0]?.tipo).toBe("usuario");
      expect(result.resultados[0]?.titulo).toBe("Maria");
    });
  });
});
