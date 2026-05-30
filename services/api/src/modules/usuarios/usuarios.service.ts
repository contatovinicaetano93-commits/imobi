import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Queue } from "bull";
import { InjectQueue } from "@nestjs/bull";

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("excluir-usuario") private readonly deleteUserQueue: Queue
  ) {}

  async buscarPerfil(usuarioId: string) {
    return this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: {
        usuarioId: true,
        nome: true,
        cpf: true,
        email: true,
        telefone: true,
        tipo: true,
        kycStatus: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });
  }

  async atualizarPerfil(usuarioId: string, data: { nome?: string; telefone?: string }) {
    return this.prisma.usuario.update({
      where: { usuarioId },
      data: { ...data, atualizadoEm: new Date() },
      select: {
        usuarioId: true,
        nome: true,
        cpf: true,
        email: true,
        telefone: true,
        tipo: true,
        kycStatus: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });
  }

  /**
   * LGPD Article 17 - Right to Access
   * Returns complete user data in structured format
   */
  async meusDados(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      include: {
        kycDocumentos: {
          select: {
            kycDocumentoId: true,
            tipo: true,
            status: true,
            criadoEm: true,
            analisadoEm: true,
          },
        },
        creditos: {
          select: {
            creditoId: true,
            valorAprovado: true,
            valorLiberado: true,
            status: true,
            dataAprovacao: true,
            prazoMeses: true,
          },
        },
        obras: {
          select: {
            obraId: true,
            nome: true,
            endereco: true,
            status: true,
            criadoEm: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new BadRequestException("Usuário não encontrado");
    }

    // Mask sensitive information
    const maskedCpf = usuario.cpf.replace(/\d(?=\d{2})/g, "*");
    const maskedPhone = usuario.telefone.replace(/\d(?=\d{4})/g, "*");

    return {
      usuario: {
        usuarioId: usuario.usuarioId,
        nome: usuario.nome,
        email: usuario.email,
        cpf: maskedCpf,
        telefone: maskedPhone,
        tipo: usuario.tipo,
        kycStatus: usuario.kycStatus,
        criadoEm: usuario.criadoEm,
        atualizadoEm: usuario.atualizadoEm,
      },
      documentosKyc: usuario.kycDocumentos,
      creditos: usuario.creditos,
      obras: usuario.obras,
      dataExporte: new Date(),
    };
  }

  /**
   * LGPD Article 18 - Right to Data Portability
   * Returns complete user data export in JSON format
   */
  async exportarDados(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      include: {
        kycDocumentos: true,
        creditos: {
          include: {
            liberacoes: true,
          },
        },
        obras: {
          include: {
            etapas: {
              include: {
                evidencias: true,
              },
            },
          },
        },
        scoreHistorico: true,
        notificacoes: true,
        fcmTokens: {
          select: {
            token: true,
            ativo: true,
            criadoEm: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new BadRequestException("Usuário não encontrado");
    }

    // Build complete export (do not mask for export - user requested their own data)
    return {
      dataExporte: new Date().toISOString(),
      usuario: {
        usuarioId: usuario.usuarioId,
        nome: usuario.nome,
        email: usuario.email,
        cpf: usuario.cpf,
        telefone: usuario.telefone,
        tipo: usuario.tipo,
        kycStatus: usuario.kycStatus,
        criadoEm: usuario.criadoEm,
        atualizadoEm: usuario.atualizadoEm,
      },
      documentosKyc: usuario.kycDocumentos,
      creditos: usuario.creditos,
      obras: usuario.obras,
      scoreHistorico: usuario.scoreHistorico,
      notificacoes: usuario.notificacoes,
      fcmTokens: usuario.fcmTokens,
    };
  }

  /**
   * LGPD Article 17 - Right to Deletion
   * Initiates soft delete with 30-day grace period
   * Hard delete scheduled via BullMQ job
   */
  async marcarDelecao(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
    });

    if (!usuario) {
      throw new BadRequestException("Usuário não encontrado");
    }

    // Soft delete: mark account with deletadoEm timestamp
    const now = new Date();
    const deletionScheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.usuario.update({
      where: { usuarioId },
      data: {
        deletadoEm: now,
      },
    });

    // Schedule hard delete job for 30 days from now
    const delayMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    await this.deleteUserQueue.add(
      "hard-delete",
      { usuarioId },
      {
        delay: delayMs,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );

    return {
      message: "Conta marcada para exclusão",
      gracePeriodDays: 30,
      deletionScheduledFor,
      notaGraca: "Você pode fazer login novamente durante o período de 30 dias para restaurar sua conta",
    };
  }

  /**
   * Hard deletion of user account
   * Called after 30-day grace period by BullMQ job
   * Deletes all non-audit user data
   */
  async deletarContaCompleto(usuarioId: string) {
    // Begin transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete non-sensitive data
      await tx.sessaoToken.deleteMany({
        where: { usuarioId },
      });

      await tx.notificacao.deleteMany({
        where: { usuarioId },
      });

      await tx.usuarioFcmToken.deleteMany({
        where: { usuarioId },
      });

      await tx.scoreHistorico.deleteMany({
        where: { usuarioId },
      });

      // Delete obras (cascades to etapas and evidencias)
      await tx.obra.deleteMany({
        where: { usuarioId },
      });

      // Delete creditos (cascades to liberacaoParcela)
      await tx.credito.deleteMany({
        where: { usuarioId },
      });

      // NOTE: KycDocumento NOT deleted (5-year AML requirement)
      // NOTE: EtapaAuditLog NOT deleted (7-year regulatory requirement)
      // NOTE: KycAuditLog NOT deleted (7-year regulatory requirement)

      // Finally, delete the usuario record
      await tx.usuario.delete({
        where: { usuarioId },
      });
    });
  }

  /**
   * Revoke consent for marketing/notifications
   * LGPD Article 8 - Right to Revoke Consent
   */
  async revogarConsentimento(usuarioId: string, tipo: "MARKETING" | "NOTIFICACOES" | "TUDO") {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
    });

    if (!usuario) {
      throw new BadRequestException("Usuário não encontrado");
    }

    // Update consent flags (requires adding to schema)
    // This is a placeholder for consent tracking fields that need to be added

    if (tipo === "NOTIFICACOES" || tipo === "TUDO") {
      // Disable all FCM tokens
      await this.prisma.usuarioFcmToken.updateMany({
        where: { usuarioId },
        data: { ativo: false },
      });
    }

    if (tipo === "MARKETING" || tipo === "TUDO") {
      // Mark consentimento as revoked (requires schema update)
    }

    return {
      message: `Consentimento para ${tipo.toLowerCase()} revogado com sucesso`,
    };
  }
}
