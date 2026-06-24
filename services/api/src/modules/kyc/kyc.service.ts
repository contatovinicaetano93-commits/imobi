import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";
import { StorageService } from "../storage/storage.service";

const KYC_TIPOS = new Set(["RG_FRENTE", "RG_VERSO", "SELFIE", "COMPROVANTE"]);
const KYC_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const KYC_MAX_BYTES = 10 * 1024 * 1024;
const KYC_SIGNED_URL_TTL = 14400;

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
    private readonly pushNotificacoes: PushNotificacoesService,
    private readonly storage: StorageService,
  ) {}

  private assertStorageConfigured() {
    if (!this.storage.useS3() && process.env.NODE_ENV === "production") {
      throw new BadRequestException(
        "Armazenamento S3 obrigatório em produção (ENABLE_S3_STORAGE=true).",
      );
    }
  }

  async resolveDocumentUrl(stored: string): Promise<string> {
    if (!stored) return stored;
    if (stored.startsWith("http://") || stored.startsWith("https://")) return stored;
    try {
      return await this.storage.getSignedUrl(stored, KYC_SIGNED_URL_TTL);
    } catch {
      return stored;
    }
  }

  async enrichDocumento<T extends { url: string; kycDocumentoId?: string }>(doc: T): Promise<T> {
    if (this.storage.isLocalKey(doc.url) && doc.kycDocumentoId) {
      return {
        ...doc,
        url: `/api/v1/kyc/documentos/${doc.kycDocumentoId}/arquivo`,
      };
    }
    return { ...doc, url: await this.resolveDocumentUrl(doc.url) };
  }

  async enrichDocumentos<T extends { url: string }>(docs: T[]): Promise<T[]> {
    return Promise.all(docs.map((d) => this.enrichDocumento(d)));
  }

  async enrichKycListResponse<T extends { documentos: { url: string }[] }>(result: T): Promise<T> {
    return {
      ...result,
      documentos: await this.enrichDocumentos(result.documentos),
    };
  }

  /** @deprecated Use uploadDocumentoArquivo (multipart). Rejeita URLs mock. */
  async uploadDocumento(usuarioId: string, tipo: string, url: string) {
    if (!url || url.includes("example.com")) {
      throw new BadRequestException(
        "URL mock não permitida. Envie o arquivo via upload (multipart/form-data).",
      );
    }
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
    });
    if (!usuario) throw new NotFoundException("Usuário não encontrado");

    const doc = await this.prisma.kycDocumento.create({
      data: { usuarioId, tipo, url, status: "PENDENTE" },
    });
    return this.enrichDocumento(doc);
  }

  async uploadDocumentoArquivo(
    usuarioId: string,
    tipo: string,
    buffer: Buffer,
    mimeType: string,
  ) {
    if (!KYC_TIPOS.has(tipo)) {
      throw new BadRequestException("Tipo de documento inválido.");
    }
    if (!KYC_MIMES.has(mimeType)) {
      throw new BadRequestException("Formato inválido. Use JPEG, PNG, WebP ou PDF.");
    }
    if (buffer.length > KYC_MAX_BYTES) {
      throw new BadRequestException("Arquivo muito grande. Máximo 10 MB.");
    }
    this.assertStorageConfigured();

    const usuario = await this.prisma.usuario.findUnique({ where: { usuarioId } });
    if (!usuario) throw new NotFoundException("Usuário não encontrado");

    const { key } = await this.storage.uploadKycDocument(buffer, mimeType, usuarioId, tipo);

    const doc = await this.prisma.kycDocumento.create({
      data: { usuarioId, tipo, url: key, status: "PENDENTE" },
    });
    return this.enrichDocumento(doc);
  }

  async listarDocumentos(usuarioId: string) {
    const docs = await this.prisma.kycDocumento.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
    });
    return this.enrichDocumentos(docs);
  }

  async obterStatus(usuarioId: string) {
    const raw = await this.prisma.kycDocumento.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
    });

    // Um registro por tipo (último envio) — evita contadores inflados por reenvios.
    const porTipo = new Map<string, (typeof raw)[0]>();
    for (const doc of raw) {
      if (!porTipo.has(doc.tipo)) porTipo.set(doc.tipo, doc);
    }
    const documentos = Array.from(porTipo.values());

    const pendentes = documentos.filter((d) => d.status === "PENDENTE").length;
    const aprovados = documentos.filter((d) => d.status === "APROVADO").length;
    const rejeitados = documentos.filter((d) => d.status === "REJEITADO").length;
    const totalTipos = 4;

    let status: string;
    if (documentos.length === 0) {
      status = "NENHUM";
    } else if (rejeitados > 0) {
      status = "REJEITADO";
    } else if (aprovados >= totalTipos && pendentes === 0) {
      status = "APROVADO";
    } else if (documentos.some((d) => d.status !== "PENDENTE" || d.url)) {
      status = "ENVIADO";
    } else {
      status = "NENHUM";
    }

    return {
      usuarioId,
      status,
      documentos: await this.enrichDocumentos(documentos),
      resumo: { pendentes, aprovados, rejeitados, totalTipos },
    };
  }

  async aprovarDocumento(kycDocumentoId: string, gestorId: string) {
    const documento = await this.prisma.kycDocumento.findUnique({
      where: { kycDocumentoId },
      include: { usuario: true },
    });
    if (!documento) throw new NotFoundException("Documento não encontrado");
    if (documento.usuarioId === gestorId) throw new ForbiddenException("Não é permitido aprovar o próprio documento.");

    const atualizado = await this.prisma.kycDocumento.update({
      where: { kycDocumentoId },
      data: {
        status: "APROVADO",
        analisadoPor: gestorId,
        analisadoEm: new Date(),
      },
    });

    // Create audit log entry
    await this.prisma.kycAuditLog.create({
      data: {
        kycDocumentoId,
        acaoTipo: "APROVADO",
        usuarioId: gestorId,
      },
    });

    // Notifica usuário
    await this.notificacoes.criar(
      documento.usuarioId,
      "KYC_APROVADO",
      "Documento KYC aprovado",
      `Seu documento "${documento.tipo}" foi aprovado com sucesso.`,
      "/dashboard/perfil"
    );

    // Envia push notification
    this.pushNotificacoes.enviarPush({
      usuarioId: documento.usuarioId,
      titulo: "Documentação Aprovada",
      mensagem: `Seu documento ${documento.tipo} foi aprovado!`,
      tipo: "KYC_APROVADO",
    }).catch(() => {});

    // BUG-003: Ensure email is sent before returning response
    try {
      await this.email.kycAprovadoEmail(documento.usuario.nome, documento.usuario.email);
    } catch (error) {
      this.logger.warn(`Failed to send KYC approval email: ${error}`);
    }

    return atualizado;
  }

  async rejeitarDocumento(
    kycDocumentoId: string,
    gestorId: string,
    motivo: string
  ) {
    const documento = await this.prisma.kycDocumento.findUnique({
      where: { kycDocumentoId },
      include: { usuario: true },
    });
    if (!documento) throw new NotFoundException("Documento não encontrado");
    if (documento.usuarioId === gestorId) throw new ForbiddenException("Não é permitido rejeitar o próprio documento.");

    if (!motivo || motivo.trim().length === 0) {
      throw new BadRequestException("Motivo da rejeição é obrigatório");
    }

    const atualizado = await this.prisma.kycDocumento.update({
      where: { kycDocumentoId },
      data: {
        status: "REJEITADO",
        analisadoPor: gestorId,
        analisadoEm: new Date(),
        motivo_rejeicao: motivo,
      },
    });

    // Create audit log entry
    await this.prisma.kycAuditLog.create({
      data: {
        kycDocumentoId,
        acaoTipo: "REJEITADO",
        usuarioId: gestorId,
        motivo,
      },
    });

    // Notifica usuário
    await this.notificacoes.criar(
      documento.usuarioId,
      "KYC_REJEITADO",
      "Documento KYC rejeitado",
      `Seu documento "${documento.tipo}" foi rejeitado. Motivo: ${motivo}. Por favor, envie um novo documento.`,
      "/dashboard/perfil"
    );

    // Envia push notification
    this.pushNotificacoes.enviarPush({
      usuarioId: documento.usuarioId,
      titulo: "Documentação Rejeitada",
      mensagem: `Seu documento foi rejeitado. Motivo: ${motivo}`,
      tipo: "KYC_REJEITADO",
      dados: { motivo },
    }).catch(() => {});

    // Envia email
    try {
      await this.email.kycRejeitadoEmail(documento.usuario.nome, documento.usuario.email, motivo);
    } catch (error) {
      this.logger.warn(`Failed to send KYC rejection email: ${error}`);
    }

    return atualizado;
  }

  async listarPendentes() {
    const docs = await this.prisma.kycDocumento.findMany({
      where: { status: "PENDENTE" },
      include: { usuario: { select: { nome: true, email: true, cpf: true } } },
      orderBy: { criadoEm: "asc" },
    });
    return this.enrichDocumentos(docs);
  }

  async verificarKycCompleto(usuarioId: string) {
    const raw = await this.prisma.kycDocumento.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
    });

    const porTipo = new Map<string, (typeof raw)[0]>();
    for (const doc of raw) {
      if (!porTipo.has(doc.tipo)) porTipo.set(doc.tipo, doc);
    }

    const tiposRequeridos = Array.from(KYC_TIPOS);
    const completo = tiposRequeridos.every((tipo) => {
      const doc = porTipo.get(tipo);
      return doc?.status === "APROVADO";
    });

    if (completo) {
      await this.prisma.usuario.update({
        where: { usuarioId },
        data: { kycStatus: "APROVADO" },
      });
    }

    return { completo, documentos: Array.from(porTipo.values()) };
  }

  async obterArquivoDocumento(kycDocumentoId: string, usuarioId: string, isManager: boolean) {
    const doc = await this.prisma.kycDocumento.findUnique({
      where: { kycDocumentoId },
    });
    if (!doc) throw new NotFoundException("Documento não encontrado");
    if (doc.usuarioId !== usuarioId && !isManager) {
      throw new ForbiddenException("Sem permissão para este documento.");
    }
    if (!this.storage.isLocalKey(doc.url)) {
      const signed = await this.resolveDocumentUrl(doc.url);
      return { redirectUrl: signed };
    }
    const { buffer, mimeType } = await this.storage.readLocalFile(doc.url);
    return { buffer, mimeType };
  }
}
