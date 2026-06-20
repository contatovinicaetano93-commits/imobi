import { EmailQueueService } from "./email-queue.service";
import { EmailWorker } from "../../workers/email.worker";

// ─── EmailQueueService ─────────────────────────────────────────────────────────

const mockQueue = { add: jest.fn().mockResolvedValue({ id: "job-1" }) };

function makeQueueService() {
  return new EmailQueueService(mockQueue as any);
}

describe("EmailQueueService — enqueue methods", () => {
  beforeEach(() => jest.clearAllMocks());

  it("bemVindo enqueues BEM_VINDO job with nome and email", async () => {
    const svc = makeQueueService();
    await svc.bemVindo("João", "joao@test.com");
    expect(mockQueue.add).toHaveBeenCalledWith(
      { tipo: "BEM_VINDO", payload: { nome: "João", email: "joao@test.com" } },
      expect.objectContaining({ attempts: 3, backoff: expect.objectContaining({ type: "exponential" }) }),
    );
  });

  it("etapaAprovada enqueues ETAPA_APROVADA job with full payload", async () => {
    const svc = makeQueueService();
    await svc.etapaAprovada("Maria", "maria@test.com", "Fundação", "Casa A", 50000);
    expect(mockQueue.add).toHaveBeenCalledWith(
      { tipo: "ETAPA_APROVADA", payload: { nome: "Maria", email: "maria@test.com", etapaNome: "Fundação", obraNome: "Casa A", valor: 50000 } },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it("parcelaLiberada enqueues PARCELA_LIBERADA job", async () => {
    const svc = makeQueueService();
    await svc.parcelaLiberada("Carlos", "c@test.com", 30000, "Obra B");
    expect(mockQueue.add).toHaveBeenCalledWith(
      { tipo: "PARCELA_LIBERADA", payload: { nome: "Carlos", email: "c@test.com", valor: 30000, obraNome: "Obra B" } },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it("kycAprovado enqueues KYC_APROVADO job", async () => {
    const svc = makeQueueService();
    await svc.kycAprovado("Ana", "ana@test.com");
    expect(mockQueue.add).toHaveBeenCalledWith(
      { tipo: "KYC_APROVADO", payload: { nome: "Ana", email: "ana@test.com" } },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it("kycRejeitado enqueues KYC_REJEITADO job with motivo", async () => {
    const svc = makeQueueService();
    await svc.kycRejeitado("Pedro", "pedro@test.com", "Documento ilegível");
    expect(mockQueue.add).toHaveBeenCalledWith(
      { tipo: "KYC_REJEITADO", payload: { nome: "Pedro", email: "pedro@test.com", motivo: "Documento ilegível" } },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it("recuperacaoSenha enqueues RECUPERACAO_SENHA job with token", async () => {
    const svc = makeQueueService();
    await svc.recuperacaoSenha("Luiz", "luiz@test.com", "reset-token-abc");
    expect(mockQueue.add).toHaveBeenCalledWith(
      { tipo: "RECUPERACAO_SENHA", payload: { nome: "Luiz", email: "luiz@test.com", token: "reset-token-abc" } },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it("contaExcluida enqueues CONTA_EXCLUIDA job", async () => {
    const svc = makeQueueService();
    await svc.contaExcluida("Rita", "rita@test.com");
    expect(mockQueue.add).toHaveBeenCalledWith(
      { tipo: "CONTA_EXCLUIDA", payload: { nome: "Rita", email: "rita@test.com" } },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it("all methods use exponential backoff with 5000ms delay", async () => {
    const svc = makeQueueService();
    await svc.bemVindo("X", "x@x.com");
    expect(mockQueue.add).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ backoff: { type: "exponential", delay: 5000 } }),
    );
  });
});

// ─── EmailWorker ───────────────────────────────────────────────────────────────

const mockEmailService = {
  bemVindoEmail: jest.fn().mockResolvedValue(true),
  etapaAprovadaEmail: jest.fn().mockResolvedValue(true),
  parcelaLiberadaEmail: jest.fn().mockResolvedValue(true),
  kycAprovadoEmail: jest.fn().mockResolvedValue(true),
  kycRejeitadoEmail: jest.fn().mockResolvedValue(true),
  recuperacaoSenhaEmail: jest.fn().mockResolvedValue(true),
  contaExcluida: jest.fn().mockResolvedValue(true),
};

function makeWorker() {
  return new EmailWorker(mockEmailService as any);
}

function makeJob(tipo: string, payload: Record<string, any>, id = "job-1"): any {
  return { id, data: { tipo, payload }, attemptsMade: 1 };
}

describe("EmailWorker — handle routing", () => {
  beforeEach(() => jest.clearAllMocks());

  it("BEM_VINDO routes to bemVindoEmail", async () => {
    const worker = makeWorker();
    await worker.handle(makeJob("BEM_VINDO", { nome: "João", email: "j@j.com" }));
    expect(mockEmailService.bemVindoEmail).toHaveBeenCalledWith("João", "j@j.com");
  });

  it("ETAPA_APROVADA routes to etapaAprovadaEmail with all params", async () => {
    const worker = makeWorker();
    await worker.handle(makeJob("ETAPA_APROVADA", { nome: "M", email: "m@m.com", etapaNome: "Fundação", obraNome: "Casa", valor: 10000 }));
    expect(mockEmailService.etapaAprovadaEmail).toHaveBeenCalledWith("M", "m@m.com", "Fundação", "Casa", 10000);
  });

  it("PARCELA_LIBERADA routes to parcelaLiberadaEmail", async () => {
    const worker = makeWorker();
    await worker.handle(makeJob("PARCELA_LIBERADA", { nome: "C", email: "c@c.com", valor: 5000, obraNome: "Obra" }));
    expect(mockEmailService.parcelaLiberadaEmail).toHaveBeenCalledWith("C", "c@c.com", 5000, "Obra");
  });

  it("KYC_APROVADO routes to kycAprovadoEmail", async () => {
    const worker = makeWorker();
    await worker.handle(makeJob("KYC_APROVADO", { nome: "A", email: "a@a.com" }));
    expect(mockEmailService.kycAprovadoEmail).toHaveBeenCalledWith("A", "a@a.com");
  });

  it("KYC_REJEITADO routes to kycRejeitadoEmail with motivo", async () => {
    const worker = makeWorker();
    await worker.handle(makeJob("KYC_REJEITADO", { nome: "B", email: "b@b.com", motivo: "Foto borrada" }));
    expect(mockEmailService.kycRejeitadoEmail).toHaveBeenCalledWith("B", "b@b.com", "Foto borrada");
  });

  it("RECUPERACAO_SENHA routes to recuperacaoSenhaEmail with token", async () => {
    const worker = makeWorker();
    await worker.handle(makeJob("RECUPERACAO_SENHA", { nome: "R", email: "r@r.com", token: "tok-123" }));
    expect(mockEmailService.recuperacaoSenhaEmail).toHaveBeenCalledWith("R", "r@r.com", "tok-123");
  });

  it("CONTA_EXCLUIDA routes to contaExcluida", async () => {
    const worker = makeWorker();
    await worker.handle(makeJob("CONTA_EXCLUIDA", { nome: "X", email: "x@x.com" }));
    expect(mockEmailService.contaExcluida).toHaveBeenCalledWith("X", "x@x.com");
  });

  it("unknown tipo does not call any email method", async () => {
    const worker = makeWorker();
    await worker.handle(makeJob("UNKNOWN_TYPE", { nome: "X", email: "x@x.com" }));
    Object.values(mockEmailService).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });
});
