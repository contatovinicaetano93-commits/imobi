import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";
import { KycDocumentoStatus } from "@prisma/client";

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
      select: { usuarioId: true },
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
      select: {
        kycDocumentoId: true,
        tipo: true,
        url: true,
        status: true,
        motivo_rejeicao: true,
        criadoEm: true,
        analisadoEm: true,
      },
    });
  }

  async obterStatus(usuarioId: string) {
    const documentos = await this.prisma.kycDocumento.findMany({
      where: { usuarioId },
      take: 50,
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

  async listarPendentes(limit = 50, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.kycDocumento.findMany({
        where: { status: "PENDENTE" },
        include: { usuario: { select: { nome: true, email: true, cpf: true } } },
        orderBy: { criadoEm: "asc" },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      this.prisma.kycDocumento.count({ where: { status: "PENDENTE" } }),
    ]);
    return { items, total };
  }

  async verificarKycCompleto(usuarioId: string) {
    const documentos = await this.prisma.kycDocumento.findMany({
      where: { usuarioId, status: "APROVADO" },
      select: { tipo: true },
      take: 50,
    });

    const tiposRequeridos = ["RG", "Selfie"];
    const tiposPresentes = documentos.map((d) => d.tipo);
    const completo = tiposRequeridos.every((tipo) => tiposPresentes.includes(tipo));

    if (completo) {
      await this.prisma.usuario.update({
        where: { usuarioId },
        data: { kycStatus: "APROVADO" },
      });

      // Issue any credits whose committee approved them while KYC was still pending.
      await this.emitirCreditosPendentes(usuarioId);
    }

    return { completo, documentos };
  }

  /** Creates Credito records for APROVADA solicitações that were held back due to pending KYC. */
  private async emitirCreditosPendentes(usuarioId: string) {
    const pendentes = await this.prisma.solicitacaoCredito.findMany({
      where: { usuarioId, status: "APROVADA", creditoEmitido: false },
      include: { comite: { select: { solicitacaoId: true } } },
    });

    for (const s of pendentes) {
      try {
        const novoCredito = await this.prisma.credito.create({
          data: {
            usuarioId: s.usuarioId,
            valorAprovado: s.valorSolicitado,
            valorLiberado: 0,
            taxaMensal: s.taxaMensal,
            prazoMeses: s.prazoMeses,
            status: "ATIVO",
            dataVencimento: new Date(Date.now() + s.prazoMeses * 30 * 24 * 60 * 60 * 1000),
          },
        });

        await this.prisma.solicitacaoCredito.update({
          where: { solicitacaoId: s.solicitacaoId },
          data: { creditoEmitido: true },
        });

        if (s.obraId) {
          await this.prisma.obra.update({
            where: { obraId: s.obraId },
            data: { creditoId: novoCredito.creditoId },
          });
        }

        await this.notificacoes.criar(
          usuarioId,
          "CREDITO_APROVADO",
          "Crédito liberado após aprovação do KYC",
          `Sua identidade foi verificada e o crédito de R$ ${Number(s.valorSolicitado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} foi ativado.`,
          "/dashboard/credito",
        );
      } catch (err) {
        this.logger.error(`Falha ao emitir crédito pós-KYC para solicitação ${s.solicitacaoId}: ${err}`);
      }
    }
  }
}
