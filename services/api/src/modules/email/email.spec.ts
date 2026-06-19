jest.mock("nodemailer", () => ({
  createTransport: jest.fn(),
}));

import * as nodemailer from "nodemailer";
import { EmailService } from "./email.service";

let mockSendMail: jest.Mock;

function makeServiceConsole(): EmailService {
  delete process.env["SMTP_HOST"];
  delete process.env["SMTP_PORT"];
  return new EmailService();
}

function makeServiceWithTransporter(): EmailService {
  mockSendMail = jest.fn();
  (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail });
  process.env["SMTP_HOST"] = "smtp.example.com";
  process.env["SMTP_PORT"] = "587";
  return new EmailService();
}

afterEach(() => {
  delete process.env["SMTP_HOST"];
  delete process.env["SMTP_PORT"];
  delete process.env["APP_URL"];
  jest.clearAllMocks();
});

describe("EmailService — enviarEmail (console mode)", () => {
  it("returns true immediately when no transporter configured", async () => {
    const svc = makeServiceConsole();
    const result = await svc.enviarEmail({ to: "a@b.com", subject: "Test", html: "<p>Hi</p>" });
    expect(result).toBe(true);
  });
});

describe("EmailService — enviarEmail (with transporter)", () => {
  it("returns true on successful send", async () => {
    mockSendMail = jest.fn().mockResolvedValue({});
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail });
    const svc = makeServiceWithTransporter();
    const result = await svc.enviarEmail({ to: "a@b.com", subject: "Teste", html: "<p>OK</p>" });
    expect(result).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it("retries up to 3 times and returns false after all attempts fail", async () => {
    const svc = makeServiceWithTransporter();
    mockSendMail.mockRejectedValue(new Error("SMTP connection refused"));
    (svc as any).sleep = jest.fn().mockResolvedValue(undefined);
    const result = await svc.enviarEmail({ to: "a@b.com", subject: "Teste", html: "<p>Fail</p>" });
    expect(result).toBe(false);
    expect(mockSendMail).toHaveBeenCalledTimes(3);
  });

  it("succeeds on second attempt after first failure", async () => {
    const svc = makeServiceWithTransporter();
    mockSendMail
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue({});
    (svc as any).sleep = jest.fn().mockResolvedValue(undefined);
    const result = await svc.enviarEmail({ to: "a@b.com", subject: "Teste", html: "<p>Retry</p>" });
    expect(result).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(2);
  });
});

describe("EmailService — recuperacaoSenhaEmail", () => {
  it("includes reset token and APP_URL in email body", async () => {
    process.env["APP_URL"] = "https://app.imbobi.com";
    const svc = makeServiceWithTransporter();
    mockSendMail.mockResolvedValue({});
    await svc.recuperacaoSenhaEmail("João", "j@j.com", "reset-token-xyz");
    const mailArgs = mockSendMail.mock.calls[0][0];
    expect(mailArgs.to).toBe("j@j.com");
    expect(mailArgs.html).toContain("reset-token-xyz");
    expect(mailArgs.html).toContain("https://app.imbobi.com");
  });
});

describe("EmailService — etapaAprovadaEmail", () => {
  it("sends email with etapa and obra names", async () => {
    const svc = makeServiceWithTransporter();
    mockSendMail.mockResolvedValue({});
    await svc.etapaAprovadaEmail("João", "j@j.com", "Fundação", "Casa A", 50000);
    const mailArgs = mockSendMail.mock.calls[0][0];
    expect(mailArgs.subject).toContain("Fundação");
    expect(mailArgs.html).toContain("Casa A");
    expect(mailArgs.html).toContain("50.000");
  });
});

describe("EmailService — contaExcluida (LGPD Art. 17)", () => {
  it("sends deletion confirmation email mentioning LGPD", async () => {
    const svc = makeServiceWithTransporter();
    mockSendMail.mockResolvedValue({});
    const result = await svc.contaExcluida("Maria", "m@m.com");
    expect(result).toBe(true);
    const mailArgs = mockSendMail.mock.calls[0][0];
    expect(mailArgs.to).toBe("m@m.com");
    expect(mailArgs.subject).toContain("Conta Excluída");
    expect(mailArgs.html).toContain("LGPD");
  });
});

describe("EmailService — kycRejeitadoEmail", () => {
  it("includes rejection motivo in email body", async () => {
    const svc = makeServiceWithTransporter();
    mockSendMail.mockResolvedValue({});
    await svc.kycRejeitadoEmail("João", "j@j.com", "Documento ilegível");
    const mailArgs = mockSendMail.mock.calls[0][0];
    expect(mailArgs.html).toContain("Documento ilegível");
  });
});
