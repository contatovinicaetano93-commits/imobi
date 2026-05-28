import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";
import { StorageService } from "../storage/storage.service";
import { KycDocumentoStatus } from "@prisma/client";
import { escapeHtml } from "../../common/utils/html-escape";
import { randomUUID } from "crypto";

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
    private readonly pushNotificacoes: PushNotificacoesService,
    private readonly storage: StorageService
  ) {}

  async verificarPermissao(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
    });
    if (!usuario || (usuario.tipo !== "GESTOR_OBRA" && usuario.tipo !== "ADMIN")) {
      throw new ForbiddenException("Acesso negado. Apenas gestores podem acessar.");
    }
  }

  async uploadDocumento(usuarioId: string, tipo: string, url: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
    });
    if (!usuario) throw new NotFoundException("Usuário não encontrado");

    return this.prisma.kycDocumento.create({
      data: { usuarioId, tipo, url, status: "PENDENTE" },
    });
  }

  async listarDocumentos(usuarioId: string) {
    return this.prisma.kycDocumento.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
    });
  }

  async obterStatus(usuarioId: string) {
    const [documentos, countByStatus] = await Promise.all([
      this.prisma.kycDocumento.findMany({
        where: { usuarioId },
        orderBy: { criadoEm: "desc" },
      }),
      this.prisma.kycDocumento.groupBy({
        by: ["status"],
        where: { usuarioId },
        _count: true,
      }),
    ]);

    const statusMap = Object.fromEntries(
      countByStatus.map((item) => [item.status, item._count])
    );

    return {
      usuarioId,
      status: documentos.length === 0 ? "NENHUM" : "ENVIADO",
      documentos,
      resumo: {
        pendentes: statusMap["PENDENTE"] || 0,
        aprovados: statusMap["APROVADO"] || 0,
        rejeitados: statusMap["REJEITADO"] || 0,
      },
    };
  }

  async aprovarDocumento(kycDocumentoId: string, gestorId: string) {
    const documento = await this.prisma.kycDocumento.findUnique({
      where: { kycDocumentoId },
      include: { usuario: true },
    });
    if (!documento) throw new NotFoundException("Documento não encontrado");

    const atualizado = await this.prisma.kycDocumento.update({
      where: { kycDocumentoId },
      data: {
        status: "APROVADO",
        analisadoPor: gestorId,
        analisadoEm: new Date(),
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

    // Envia email
    this.email
      .kycAprovadoEmail(documento.usuario.nome, documento.usuario.email)
      .catch(() => {});

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

    if (!motivo || motivo.trim().length === 0) {
      throw new BadRequestException("Motivo da rejeição é obrigatório");
    }

    // Escape HTML para prevenir XSS em emails e notificações
    const motivoEscapado = escapeHtml(motivo);

    const atualizado = await this.prisma.kycDocumento.update({
      where: { kycDocumentoId },
      data: {
        status: "REJEITADO",
        analisadoPor: gestorId,
        analisadoEm: new Date(),
        motivo_rejeicao: motivo, // Armazenar original sem escape (Prisma trata isso)
      },
    });

    // Notifica usuário
    await this.notificacoes.criar(
      documento.usuarioId,
      "KYC_REJEITADO",
      "Documento KYC rejeitado",
      `Seu documento "${documento.tipo}" foi rejeitado. Motivo: ${motivoEscapado}. Por favor, envie um novo documento.`,
      "/dashboard/perfil"
    );

    // Envia push notification
    this.pushNotificacoes.enviarPush({
      usuarioId: documento.usuarioId,
      titulo: "Documentação Rejeitada",
      mensagem: `Seu documento foi rejeitado. Motivo: ${motivoEscapado}`,
      tipo: "KYC_REJEITADO",
      dados: { motivo: motivoEscapado },
    }).catch(() => {});

    // Envia email (passa escapado)
    this.email
      .kycRejeitadoEmail(documento.usuario.nome, documento.usuario.email, motivoEscapado)
      .catch(() => {});

    return atualizado;
  }

  async listarPendentes() {
    return this.prisma.kycDocumento.findMany({
      where: { status: "PENDENTE" },
      include: { usuario: { select: { nome: true, email: true, cpf: true } } },
      orderBy: { criadoEm: "asc" },
    });
  }

  async verificarKycCompleto(usuarioId: string) {
    const tiposRequeridos = ["RG", "Selfie"];

    const documentos = await this.prisma.kycDocumento.findMany({
      where: { usuarioId, status: "APROVADO" },
    });

    const tiposPresentes = new Set(documentos.map((d) => d.tipo));
    const completo = tiposRequeridos.every((tipo) => tiposPresentes.has(tipo));

    if (completo) {
      await this.prisma.usuario.update({
        where: { usuarioId },
        data: { kycStatus: "APROVADO" },
      });
    }

    return { completo, documentos };
  }

  async gerarUrlUpload(usuarioId: string, tipo: string, mimeType: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { usuarioId: true },
    });
    if (!usuario) throw new NotFoundException("Usuário não encontrado");

    // Validate document type
    const tiposValidos = ["RG", "CPF", "CARTEIRA_MOTORISTA", "PASSPORT", "COMPROVANTE_ENDERECO"];
    if (!tiposValidos.includes(tipo)) {
      throw new BadRequestException(`Tipo de documento inválido: ${tipo}`);
    }

    // Generate S3 key
    const docId = randomUUID();
    const extension = this.getExtensionFromMimeType(mimeType);
    const key = `kyc/${usuarioId}/${tipo}/${docId}${extension}`;

    // Get signed URL for upload
    const uploadUrl = await this.storage.getSignedUploadUrl(key, mimeType);

    return {
      uploadUrl,
      key,
      expiresIn: 3600, // 1 hour
    };
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "application/pdf": ".pdf",
    };
    return mimeToExt[mimeType] || "";
  }
}
