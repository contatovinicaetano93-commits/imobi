import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";
import { KycDocumentoStatus } from "@prisma/client";

@Injectable()
export class KycService {
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

    return {
      usuarioId,
      status: documentos.length === 0 ? "NENHUM" : "ENVIADO",
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

    const atualizado = await this.prisma.kycDocumento.update({
      where: { kycDocumentoId },
      data: {
        status: "REJEITADO",
        analisadoPor: gestorId,
        analisadoEm: new Date(),
        motivo_rejeicao: motivo,
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
    this.email
      .kycRejeitadoEmail(documento.usuario.nome, documento.usuario.email, motivo)
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
