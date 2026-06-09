import { BadRequestException, NotFoundException } from "@nestjs/common";
import { KycService } from "./kyc.service";

const GESTOR_ID = "gestor-uuid-001";
const USUARIO_ID = "usuario-uuid-001";
const DOC_ID = "doc-uuid-001";

const baseDocumento = {
  kycDocumentoId: DOC_ID,
  usuarioId: USUARIO_ID,
  tipo: "RG",
  url: "kyc/rg-foto.jpg",
  status: "PENDENTE",
  analisadoPor: null,
  analisadoEm: null,
  motivo_rejeicao: null,
  usuario: { nome: "João Silva", email: "joao@test.com" },
};

const docAtualizado = { ...baseDocumento, status: "APROVADO", analisadoPor: GESTOR_ID };
const docRejeitado = { ...baseDocumento, status: "REJEITADO", analisadoPor: GESTOR_ID, motivo_rejeicao: "Foto ilegível" };

function buildService(overrides: {
  documento?: any;
  updateManyCount?: number;
  docAtualizado?: any;
} = {}) {
  const documento = overrides.documento !== undefined ? overrides.documento : baseDocumento;
  const updateManyCount = overrides.updateManyCount ?? 1;
  const docPos = overrides.docAtualizado ?? docAtualizado;

  const prisma = {
    kycDocumento: {
      findUnique: jest.fn()
        .mockResolvedValueOnce(documento)   // chamada inicial (busca + include usuario)
        .mockResolvedValue(docPos),          // chamada após updateMany (fetch do atualizado)
      updateMany: jest.fn().mockResolvedValue({ count: updateManyCount }),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ ...baseDocumento }),
    },
    kycAuditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    usuario: {
      findUnique: jest.fn().mockResolvedValue({ usuarioId: USUARIO_ID }),
      update: jest.fn().mockResolvedValue({}),
    },
  } as any;

  const notificacoes = { criar: jest.fn().mockResolvedValue({}) } as any;
  const email = {
    kycAprovadoEmail: jest.fn().mockResolvedValue({}),
    kycRejeitadoEmail: jest.fn().mockResolvedValue({}),
  } as any;
  const pushNotificacoes = { enviarPush: jest.fn().mockResolvedValue({}) } as any;

  const service = new KycService(prisma, notificacoes, email, pushNotificacoes);
  return { service, prisma, notificacoes, email, pushNotificacoes };
}

// ─── aprovarDocumento ─────────────────────────────────────────────────────────

describe("KycService.aprovarDocumento — caminho feliz", () => {
  it("retorna o documento atualizado", async () => {
    const { service } = buildService();
    const result = await service.aprovarDocumento(DOC_ID, GESTOR_ID);
    expect(result).toEqual(docAtualizado);
  });

  it("usa updateMany com guard de status PENDENTE", async () => {
    const { service, prisma } = buildService();
    await service.aprovarDocumento(DOC_ID, GESTOR_ID);

    expect(prisma.kycDocumento.updateMany).toHaveBeenCalledWith({
      where: { kycDocumentoId: DOC_ID, status: "PENDENTE" },
      data: expect.objectContaining({ status: "APROVADO", analisadoPor: GESTOR_ID }),
    });
  });

  it("cria audit log com APROVADO e gestorId", async () => {
    const { service, prisma } = buildService();
    await service.aprovarDocumento(DOC_ID, GESTOR_ID);

    expect(prisma.kycAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kycDocumentoId: DOC_ID,
        acaoTipo: "APROVADO",
        usuarioId: GESTOR_ID,
      }),
    });
  });

  it("notifica o usuário com KYC_APROVADO", async () => {
    const { service, notificacoes } = buildService();
    await service.aprovarDocumento(DOC_ID, GESTOR_ID);

    expect(notificacoes.criar).toHaveBeenCalledWith(
      USUARIO_ID,
      "KYC_APROVADO",
      expect.any(String),
      expect.stringContaining("RG"),
      expect.any(String)
    );
  });

  it("envia email de aprovação", async () => {
    const { service, email } = buildService();
    await service.aprovarDocumento(DOC_ID, GESTOR_ID);

    expect(email.kycAprovadoEmail).toHaveBeenCalledWith("João Silva", "joao@test.com");
  });
});

describe("KycService.aprovarDocumento — atomicidade (Bug 11)", () => {
  it("lança BadRequestException se updateMany count=0 (dupla aprovação)", async () => {
    const { service } = buildService({ updateManyCount: 0 });
    await expect(service.aprovarDocumento(DOC_ID, GESTOR_ID)).rejects.toThrow(BadRequestException);
  });

  it("NÃO cria audit log se updateMany count=0", async () => {
    const { service, prisma } = buildService({ updateManyCount: 0 });
    await expect(service.aprovarDocumento(DOC_ID, GESTOR_ID)).rejects.toThrow();
    expect(prisma.kycAuditLog.create).not.toHaveBeenCalled();
  });

  it("NÃO notifica se updateMany count=0", async () => {
    const { service, notificacoes } = buildService({ updateManyCount: 0 });
    await expect(service.aprovarDocumento(DOC_ID, GESTOR_ID)).rejects.toThrow();
    expect(notificacoes.criar).not.toHaveBeenCalled();
  });

  it("NÃO envia email se updateMany count=0", async () => {
    const { service, email } = buildService({ updateManyCount: 0 });
    await expect(service.aprovarDocumento(DOC_ID, GESTOR_ID)).rejects.toThrow();
    expect(email.kycAprovadoEmail).not.toHaveBeenCalled();
  });

  it("lança NotFoundException se documento não existe", async () => {
    const { service } = buildService({ documento: null });
    await expect(service.aprovarDocumento(DOC_ID, GESTOR_ID)).rejects.toThrow(NotFoundException);
  });
});

// ─── rejeitarDocumento ────────────────────────────────────────────────────────

describe("KycService.rejeitarDocumento — caminho feliz", () => {
  it("retorna o documento atualizado como REJEITADO", async () => {
    const { service } = buildService({ docAtualizado: docRejeitado });
    const result = await service.rejeitarDocumento(DOC_ID, GESTOR_ID, "Foto ilegível");
    expect(result).toEqual(docRejeitado);
  });

  it("usa updateMany com guard PENDENTE → REJEITADO e persiste motivo", async () => {
    const { service, prisma } = buildService({ docAtualizado: docRejeitado });
    await service.rejeitarDocumento(DOC_ID, GESTOR_ID, "Foto ilegível");

    expect(prisma.kycDocumento.updateMany).toHaveBeenCalledWith({
      where: { kycDocumentoId: DOC_ID, status: "PENDENTE" },
      data: expect.objectContaining({
        status: "REJEITADO",
        analisadoPor: GESTOR_ID,
        motivo_rejeicao: "Foto ilegível",
      }),
    });
  });

  it("cria audit log com REJEITADO, gestorId e motivo", async () => {
    const { service, prisma } = buildService({ docAtualizado: docRejeitado });
    await service.rejeitarDocumento(DOC_ID, GESTOR_ID, "Foto ilegível");

    expect(prisma.kycAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kycDocumentoId: DOC_ID,
        acaoTipo: "REJEITADO",
        usuarioId: GESTOR_ID,
        motivo: "Foto ilegível",
      }),
    });
  });

  it("notifica usuário com KYC_REJEITADO e inclui motivo na mensagem", async () => {
    const { service, notificacoes } = buildService({ docAtualizado: docRejeitado });
    await service.rejeitarDocumento(DOC_ID, GESTOR_ID, "Foto ilegível");

    expect(notificacoes.criar).toHaveBeenCalledWith(
      USUARIO_ID,
      "KYC_REJEITADO",
      expect.any(String),
      expect.stringContaining("Foto ilegível"),
      expect.any(String)
    );
  });

  it("envia email de rejeição com motivo", async () => {
    const { service, email } = buildService({ docAtualizado: docRejeitado });
    await service.rejeitarDocumento(DOC_ID, GESTOR_ID, "Foto ilegível");

    expect(email.kycRejeitadoEmail).toHaveBeenCalledWith(
      "João Silva",
      "joao@test.com",
      "Foto ilegível"
    );
  });
});

describe("KycService.rejeitarDocumento — validações e atomicidade (Bug 11)", () => {
  it("lança BadRequestException se motivo vazio", async () => {
    const { service } = buildService();
    await expect(service.rejeitarDocumento(DOC_ID, GESTOR_ID, "")).rejects.toThrow(BadRequestException);
  });

  it("lança BadRequestException se motivo só tem espaços", async () => {
    const { service } = buildService();
    await expect(service.rejeitarDocumento(DOC_ID, GESTOR_ID, "   ")).rejects.toThrow(BadRequestException);
  });

  it("lança BadRequestException se updateMany count=0 (dupla rejeição)", async () => {
    const { service } = buildService({ updateManyCount: 0 });
    await expect(service.rejeitarDocumento(DOC_ID, GESTOR_ID, "motivo")).rejects.toThrow(BadRequestException);
  });

  it("NÃO cria audit log em dupla rejeição (count=0)", async () => {
    const { service, prisma } = buildService({ updateManyCount: 0 });
    await expect(service.rejeitarDocumento(DOC_ID, GESTOR_ID, "motivo")).rejects.toThrow();
    expect(prisma.kycAuditLog.create).not.toHaveBeenCalled();
  });

  it("lança NotFoundException se documento não existe", async () => {
    const { service } = buildService({ documento: null });
    await expect(service.rejeitarDocumento(DOC_ID, GESTOR_ID, "motivo")).rejects.toThrow(NotFoundException);
  });
});

// ─── verificarKycCompleto ─────────────────────────────────────────────────────

describe("KycService.verificarKycCompleto", () => {
  it("retorna completo:false se RG e Selfie não estão ambos aprovados", async () => {
    const { service, prisma } = buildService();
    prisma.kycDocumento.findMany.mockResolvedValueOnce([
      { tipo: "RG", status: "APROVADO" },
    ]);

    const result = await service.verificarKycCompleto(USUARIO_ID);
    expect(result.completo).toBe(false);
  });

  it("retorna completo:true e atualiza kycStatus quando RG + Selfie aprovados", async () => {
    const { service, prisma } = buildService();
    prisma.kycDocumento.findMany.mockResolvedValueOnce([
      { tipo: "RG", status: "APROVADO" },
      { tipo: "Selfie", status: "APROVADO" },
    ]);

    const result = await service.verificarKycCompleto(USUARIO_ID);
    expect(result.completo).toBe(true);
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { usuarioId: USUARIO_ID },
      data: { kycStatus: "APROVADO" },
    });
  });

  it("NÃO atualiza kycStatus quando KYC incompleto", async () => {
    const { service, prisma } = buildService();
    prisma.kycDocumento.findMany.mockResolvedValueOnce([{ tipo: "RG", status: "APROVADO" }]);

    await service.verificarKycCompleto(USUARIO_ID);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });
});
