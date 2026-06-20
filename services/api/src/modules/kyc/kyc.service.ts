import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
    private readonly pushNotificacoes: PushNotificacoesService
  ) {}

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
    const documentos = await this.prisma.kycDocumento.findMany({
      where: { usuarioId },
    });

    const pendentes = documentos.filter((d) => d.status === "PENDENTE").length;
    const aprovados = documentos.filter((d) => d.status === "APROVADO").length;
    const rejeitados = documentos.filter((d) => d.status === "REJEITADO").length;

    let status: string;
    if (documentos.length === 0) {
      status = "NENHUM";
    } else if (rejeitados > 0) {
      status = "REJEITADO";
    } else if (aprovados > 0 && pendentes === 0) {
      status = "APROVADO";
    } else {
      status = "ENVIADO";
    }

    return {
      usuarioId,
      status,
      documentos,
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
    return this.prisma.kycDocumento.findMany({
      where: { status: "PENDENTE" },
      include: { usuario: { select: { nome: true, email: true, cpf: true } } },
      orderBy: { criadoEm: "asc" },
    });
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
