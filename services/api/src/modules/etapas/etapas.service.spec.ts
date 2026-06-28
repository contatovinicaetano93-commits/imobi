import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { EtapasService } from "./etapas.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";

describe("EtapasService", () => {
  let service: EtapasService;

  const prisma = {
    etapaObra: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    evidenciaEtapa: { count: jest.fn() },
    credito: { findFirst: jest.fn() },
    obra: { update: jest.fn() },
    $transaction: jest.fn(),
  };

  const notificacoes = { criar: jest.fn().mockResolvedValue(undefined) };
  const email = { capitalFaseAguardandoPagamentoEmail: jest.fn().mockResolvedValue(undefined) };
  const pushNotificacoes = { enviarPush: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtapasService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificacoesService, useValue: notificacoes },
        { provide: EmailService, useValue: email },
        { provide: PushNotificacoesService, useValue: pushNotificacoes },
      ],
    }).compile();

    service = module.get(EtapasService);
    jest.clearAllMocks();
  });

  describe("aprovar", () => {
    const etapaBase = {
      etapaId: "e1",
      nome: "Fundação",
      percentualObra: 20,
      valorLiberacao: 20000,
      obra: {
        obraId: "o1",
        usuarioId: "u1",
        nome: "Obra Teste",
        status: "EM_EXECUCAO",
        creditoId: null,
        credito: null,
        usuario: { nome: "Tomador", email: "t@test.com" },
      },
    };

    it("rejeita aprovação sem crédito ativo (não marca etapa concluída)", async () => {
      prisma.etapaObra.findUnique.mockResolvedValue(etapaBase);
      prisma.evidenciaEtapa.count.mockResolvedValue(1);
      prisma.credito.findFirst.mockResolvedValue(null);

      await expect(service.aprovar("eng1", "e1")).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("cria liberação AGUARDANDO_PAGAMENTO quando crédito ativo", async () => {
      prisma.etapaObra.findUnique.mockResolvedValue({
        ...etapaBase,
        obra: {
          ...etapaBase.obra,
          creditoId: "c1",
          credito: { creditoId: "c1", status: "ATIVO", valorAprovado: 100000 },
        },
      });
      prisma.evidenciaEtapa.count.mockResolvedValue(2);
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          etapaObra: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          etapaAuditLog: { create: jest.fn().mockResolvedValue({}) },
          liberacaoParcela: {
            create: jest.fn().mockResolvedValue({
              liberacaoId: "lib1",
              status: "AGUARDANDO_PAGAMENTO",
            }),
          },
        };
        return fn(tx);
      });

      const result = await service.aprovar("eng1", "e1", "OK");

      expect(result.liberacaoId).toBe("lib1");
      expect(result.aguardandoPagamento).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
