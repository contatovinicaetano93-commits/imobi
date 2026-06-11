import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { DossieService } from "./dossie.service";
import { PrismaService } from "../prisma/prisma.service";

describe("DossieService", () => {
  let service: DossieService;

  const mockPrismaService = {
    dossieCredito: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dossieUnidade: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    dossieRecebivel: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    dossieAuditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  const dono = { id: "user-1", tipo: "TOMADOR" };
  const outroUsuario = { id: "user-2", tipo: "TOMADOR" };
  const analista = { id: "analista-1", tipo: "ADMIN" };

  const fichaCompleta = {
    nomeEmpreendimento: "Residencial Aurora",
    speRazaoSocial: "Aurora Empreendimentos SPE Ltda",
    speCnpj: "12345678000190",
    endereco: "Rua das Flores, 100",
    cidade: "Curitiba",
    uf: "PR",
    tipoEmpreendimento: "RESIDENCIAL",
    patrimonioAfetacao: true,
    areaTerrenoM2: 1000,
    areaConstruidaM2: 5000,
    areaPrivativaTotalM2: 4000,
    valorTerreno: 2_000_000,
    dataLancamento: new Date("2025-01-10T00:00:00.000Z"),
    dataInicioObras: new Date("2025-02-01T00:00:00.000Z"),
    dataPrevisaoTermino: new Date("2027-02-01T00:00:00.000Z"),
    dataHabiteSe: null,
    alienacaoFiduciariaTerreno: true,
    alienacaoFiduciariaUnidades: false,
    seguroObra: true,
    percentualEntrada: 10,
    percentualObras: 30,
    percentualChaves: 60,
    orcamentoOriginal: 10_000_000,
    orcamentoAtual: 10_500_000,
    custoIncorrido: 3_000_000,
    custoAIncorrer: 7_500_000,
    percentualCronogramaFisico: 30,
    percentualCronogramaFinanceiro: 28,
  };

  const dossieCompleto = {
    dossieId: "dossie-1",
    usuarioId: dono.id,
    status: "RASCUNHO",
    etapasConcluidas: [1, 2, 3, 4, 5, 6, 7],
    possuiAcordoNaoConcorrenciaPermuta: null,
    empresaNome: "Construtora Aurora",
    empresaCnpj: "98765432000110",
    empresaWebsite: null,
    empresaAnoFundacao: 1998,
    ...fichaCompleta,
    unidades: [
      {
        unidadeId: "u1",
        numeroContrato: "CT-001",
        numeroUnidade: "101",
        areaPrivativaM2: 80,
        clienteNome: "João da Silva",
        clienteCpfCnpj: "12345678901",
        dataVenda: new Date("2025-03-01T00:00:00.000Z"),
        valorVenda: 500_000,
        valorTabela: 520_000,
        status: "VENDIDA",
        indexador: "INCC",
        taxaJurosMensal: 0.8,
        sistemaAmortizacao: "PRICE",
      },
    ],
    recebiveis: [],
    distratos: [],
    documentos: [
      {
        tipo: "DEMONSTRACAO_FINANCEIRA",
        url: "https://s3.amazonaws.com/imbobi/df-2024.pdf",
        nomeArquivo: "df-2024.pdf",
        anoExercicio: 2024,
        descricao: null,
      },
      {
        tipo: "CRONOGRAMA_FISICO_FINANCEIRO",
        url: "https://s3.amazonaws.com/imbobi/cronograma.pdf",
        nomeArquivo: "cronograma.pdf",
        anoExercicio: null,
        descricao: null,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DossieService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DossieService>(DossieService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("submeter", () => {
    it("deve lançar NotFoundException quando o dossiê não existe", async () => {
      mockPrismaService.dossieCredito.findUnique.mockResolvedValue(null);

      await expect(service.submeter("inexistente", dono)).rejects.toThrow(
        NotFoundException
      );
    });

    it("deve lançar ForbiddenException quando o usuário não é o dono", async () => {
      mockPrismaService.dossieCredito.findUnique.mockResolvedValue(dossieCompleto);

      await expect(service.submeter("dossie-1", outroUsuario)).rejects.toThrow(
        ForbiddenException
      );
    });

    it("deve lançar ConflictException quando o status não permite submissão", async () => {
      mockPrismaService.dossieCredito.findUnique.mockResolvedValue({
        ...dossieCompleto,
        status: "APROVADO",
      });

      await expect(service.submeter("dossie-1", dono)).rejects.toThrow(
        ConflictException
      );
    });

    it("deve lançar BadRequestException quando o dossiê está incompleto", async () => {
      mockPrismaService.dossieCredito.findUnique.mockResolvedValue({
        ...dossieCompleto,
        etapasConcluidas: [1, 2],
        unidades: [],
        documentos: [],
      });

      await expect(service.submeter("dossie-1", dono)).rejects.toThrow(
        BadRequestException
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it("deve exigir resposta sobre acordo de permuta quando há unidades PERMUTA", async () => {
      mockPrismaService.dossieCredito.findUnique.mockResolvedValue({
        ...dossieCompleto,
        unidades: [
          ...dossieCompleto.unidades,
          {
            ...dossieCompleto.unidades[0],
            unidadeId: "u2",
            numeroUnidade: "102",
            status: "PERMUTA",
          },
        ],
        possuiAcordoNaoConcorrenciaPermuta: null,
      });

      await expect(service.submeter("dossie-1", dono)).rejects.toThrow(
        BadRequestException
      );
    });

    it("deve transicionar RASCUNHO → EM_ANALISE e gravar auditoria quando completo", async () => {
      mockPrismaService.dossieCredito.findUnique.mockResolvedValue(dossieCompleto);
      mockPrismaService.dossieCredito.update.mockResolvedValue({
        ...dossieCompleto,
        status: "EM_ANALISE",
      });
      mockPrismaService.dossieAuditLog.create.mockResolvedValue({});

      const resultado = await service.submeter("dossie-1", dono);

      expect(resultado.status).toBe("EM_ANALISE");
      expect(mockPrismaService.dossieCredito.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { dossieId: "dossie-1" },
          data: expect.objectContaining({
            status: "EM_ANALISE",
            submetidoEm: expect.any(Date),
          }),
        })
      );
      expect(mockPrismaService.dossieAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dossieId: "dossie-1",
            acaoTipo: "SUBMETIDO",
            statusAnterior: "RASCUNHO",
            statusNovo: "EM_ANALISE",
            usuarioId: dono.id,
          }),
        })
      );
    });

    it("deve permitir ressubmissão a partir de PENDENCIA", async () => {
      mockPrismaService.dossieCredito.findUnique.mockResolvedValue({
        ...dossieCompleto,
        status: "PENDENCIA",
      });
      mockPrismaService.dossieCredito.update.mockResolvedValue({
        ...dossieCompleto,
        status: "EM_ANALISE",
      });
      mockPrismaService.dossieAuditLog.create.mockResolvedValue({});

      const resultado = await service.submeter("dossie-1", dono);

      expect(resultado.status).toBe("EM_ANALISE");
    });
  });

  describe("atualizarStatus", () => {
    it("deve lançar ForbiddenException para usuário que não é analista", async () => {
      await expect(
        service.atualizarStatus("dossie-1", dono, { status: "APROVADO" })
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.dossieCredito.findUnique).not.toHaveBeenCalled();
    });

    it("deve lançar ConflictException para transição inválida (RASCUNHO → APROVADO)", async () => {
      mockPrismaService.dossieCredito.findUnique.mockResolvedValue({
        ...dossieCompleto,
        status: "RASCUNHO",
      });

      await expect(
        service.atualizarStatus("dossie-1", analista, { status: "APROVADO" })
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it("deve lançar ConflictException para status terminal (APROVADO → PENDENCIA)", async () => {
      mockPrismaService.dossieCredito.findUnique.mockResolvedValue({
        ...dossieCompleto,
        status: "APROVADO",
      });

      await expect(
        service.atualizarStatus("dossie-1", analista, { status: "PENDENCIA" })
      ).rejects.toThrow(ConflictException);
    });

    it("deve aplicar EM_ANALISE → APROVADO com analisadoPor/analisadoEm e auditoria", async () => {
      mockPrismaService.dossieCredito.findUnique.mockResolvedValue({
        ...dossieCompleto,
        status: "EM_ANALISE",
      });
      mockPrismaService.dossieCredito.update.mockResolvedValue({
        ...dossieCompleto,
        status: "APROVADO",
      });
      mockPrismaService.dossieAuditLog.create.mockResolvedValue({});

      const resultado = await service.atualizarStatus("dossie-1", analista, {
        status: "APROVADO",
        observacoes: "Dossiê aprovado sem ressalvas",
      });

      expect(resultado.status).toBe("APROVADO");
      expect(mockPrismaService.dossieCredito.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { dossieId: "dossie-1" },
          data: expect.objectContaining({
            status: "APROVADO",
            analisadoPor: analista.id,
            analisadoEm: expect.any(Date),
          }),
        })
      );
      expect(mockPrismaService.dossieAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            acaoTipo: "STATUS_ALTERADO",
            statusAnterior: "EM_ANALISE",
            statusNovo: "APROVADO",
            usuarioId: analista.id,
            observacoes: "Dossiê aprovado sem ressalvas",
          }),
        })
      );
    });

    it("deve aplicar EM_ANALISE → PENDENCIA (volta para correção)", async () => {
      mockPrismaService.dossieCredito.findUnique.mockResolvedValue({
        ...dossieCompleto,
        status: "EM_ANALISE",
      });
      mockPrismaService.dossieCredito.update.mockResolvedValue({
        ...dossieCompleto,
        status: "PENDENCIA",
      });
      mockPrismaService.dossieAuditLog.create.mockResolvedValue({});

      const resultado = await service.atualizarStatus("dossie-1", analista, {
        status: "PENDENCIA",
        observacoes: "Falta DF de 2023",
      });

      expect(resultado.status).toBe("PENDENCIA");
    });
  });

  describe("importarUnidades", () => {
    it("não deve persistir nada quando há erros de validação, apontando a linha", async () => {
      mockPrismaService.dossieCredito.findUnique.mockResolvedValue(dossieCompleto);

      const resultado = await service.importarUnidades("dossie-1", dono, [
        { numeroUnidade: "101", areaPrivativaM2: "80,5", status: "ESTOQUE" },
        { numeroUnidade: "", areaPrivativaM2: "abc", status: "INVALIDO" },
      ]);

      expect(resultado.importadas).toBe(0);
      expect(resultado.erros).toHaveLength(1);
      expect(resultado.erros[0].linha).toBe(2);
      expect(resultado.erros[0].mensagens.length).toBeGreaterThan(0);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it("deve persistir todas as linhas quando não há erros", async () => {
      mockPrismaService.dossieCredito.findUnique.mockResolvedValue(dossieCompleto);
      mockPrismaService.dossieUnidade.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.dossieUnidade.createMany.mockResolvedValue({ count: 2 });

      const resultado = await service.importarUnidades("dossie-1", dono, [
        {
          numeroUnidade: "101",
          areaPrivativaM2: "80,5",
          status: "vendida",
          clienteNome: "Maria",
          valorVenda: "R$ 450.000,00",
          dataVenda: "15/03/2025",
        },
        { numeroUnidade: "102", areaPrivativaM2: 75, status: "ESTOQUE" },
      ]);

      expect(resultado.importadas).toBe(2);
      expect(resultado.erros).toHaveLength(0);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
