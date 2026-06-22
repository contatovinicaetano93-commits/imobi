import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";
import { StorageService } from "../storage/storage.service";

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

  async uploadDocumento(usuarioId: string, tipo: string, url: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { usuarioId } });
    if (!usuario) throw new NotFoundException("Usuário não encontrado");

    const signedUrl = await this.storage.getSignedUrl(url).catch(() => url);

    return this.prisma.kycDocumento.create({
      data: { usuarioId, tipo, url, status: "PENDENTE" },
    }).then(async (doc) => ({ ...doc, url: signedUrl }));
  }

  async uploadArquivo(usuarioId: string, tipo: string, buffer: Buffer, mimeType: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { usuarioId } });
    if (!usuario) throw new NotFoundException("Usuário não encontrado");

    const { key, url } = await this.storage.uploadKyc(buffer, mimeType, usuarioId);
    const doc = await this.prisma.kycDocumento.create({
      data: { usuarioId, tipo, url: key, status: "PENDENTE" },
    });
    return { ...doc, url };
  }

  private async signDoc<T extends { url: string }>(doc: T): Promise<T & { url: string }> {
    const url = await this.storage.getSignedUrl(doc.url).catch(() => doc.url);
    return { ...doc, url };
  }

  async listarDocumentos(usuarioId: string) {
    const docs = await this.prisma.kycDocumento.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
    });
    return Promise.all(docs.map((d) => this.signDoc(d)));
  }

  async obterStatus(usuarioId: string) {
    const documentos = await this.prisma.kycDocumento.findMany({
      where: { usuarioId },
    });

    const pendentes = documentos.filter((d) => d.status === "PENDENTE").length;
    const aprovados = documentos.filter((d) => d.status === "APROVADO").length;
    const rejeitados = documentos.filter((d) => d.status === "REJEITADO").length;

    let status: string;
    if (documentos.length === 0) status = "NENHUM";
    else if (rejeitados > 0) status = "REJEITADO";
    else if (aprovados > 0 && pendentes === 0) status = "APROVADO";
    else status = "ENVIADO";

    const signedDocs = await Promise.all(documentos.map((d) => this.signDoc(d)));

    return {
      usuarioId,
      status,
      documentos: signedDocs,
      resumo: { pendentes, aprovados, rejeitados },
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
      data: { status: "APROVADO", analisadoPor: gestorId, analisadoEm: new Date() },
    });

    await this.prisma.kycAuditLog.create({
      data: { kycDocumentoId, acaoTipo: "APROVADO", usuarioId: gestorId },
    });

    await this.verificarKycCompleto(documento.usuarioId);

    await this.notificacoes.criar(
      documento.usuarioId,
      "KYC_APROVADO",
      "Documento KYC aprovado",
      `Seu documento "${documento.tipo}" foi aprovado com sucesso.`,
      "/dashboard/perfil",
    );

    this.pushNotificacoes.enviarPush({
      usuarioId: documento.usuarioId,
      titulo: "Documentação Aprovada",
      mensagem: `Seu documento ${documento.tipo} foi aprovado!`,
      tipo: "KYC_APROVADO",
    }).catch(() => {});

    try {
      await this.email.kycAprovadoEmail(documento.usuario.nome, documento.usuario.email);
    } catch (error) {
      this.logger.warn(`Failed to send KYC approval email: ${error}`);
    }

    return atualizado;
  }

  async rejeitarDocumento(kycDocumentoId: string, gestorId: string, motivo: string) {
    const documento = await this.prisma.kycDocumento.findUnique({
      where: { kycDocumentoId },
      include: { usuario: true },
    });
    if (!documento) throw new NotFoundException("Documento não encontrado");
    if (documento.usuarioId === gestorId) throw new ForbiddenException("Não é permitido rejeitar o próprio documento.");
    if (!motivo?.trim()) throw new BadRequestException("Motivo da rejeição é obrigatório");

    const atualizado = await this.prisma.kycDocumento.update({
      where: { kycDocumentoId },
      data: {
        status: "REJEITADO",
        analisadoPor: gestorId,
        analisadoEm: new Date(),
        motivo_rejeicao: motivo,
      },
    });

    await this.prisma.kycAuditLog.create({
      data: { kycDocumentoId, acaoTipo: "REJEITADO", usuarioId: gestorId, motivo },
    });

    await this.notificacoes.criar(
      documento.usuarioId,
      "KYC_REJEITADO",
      "Documento KYC rejeitado",
      `Seu documento "${documento.tipo}" foi rejeitado. Motivo: ${motivo}.`,
      "/dashboard/perfil",
    );

    this.pushNotificacoes.enviarPush({
      usuarioId: documento.usuarioId,
      titulo: "Documentação Rejeitada",
      mensagem: `Seu documento foi rejeitado. Motivo: ${motivo}`,
      tipo: "KYC_REJEITADO",
      dados: { motivo },
    }).catch(() => {});

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
    return Promise.all(docs.map((d) => this.signDoc(d)));
  }

  async verificarKycCompleto(usuarioId: string) {
    const documentos = await this.prisma.kycDocumento.findMany({
      where: { usuarioId, status: "APROVADO" },
    });

    const tiposRequeridos = ["RG", "Selfie"];
    const tiposPresentes = documentos.map((d) => d.tipo);
    const completo = tiposRequeridos.every((tipo) => tiposPresentes.includes(tipo));

    if (completo) {
      await this.prisma.usuario.update({
        where: { usuarioId },
        data: { kycStatus: "APROVADO" },
      });
    }

    return { completo, documentos };
  }
}
