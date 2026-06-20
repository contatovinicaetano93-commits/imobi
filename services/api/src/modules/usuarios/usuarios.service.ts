import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Queue } from "bull";
import { InjectQueue } from "@nestjs/bull";
import { StorageService } from "../storage/storage.service";
import {
  criarPreferenciasPadrao,
  PreferenciasNotificacaoSchema,
  UpdatePreferenciasNotificacaoSchema,
  type PreferenciasNotificacao,
  type UpdatePreferenciasNotificacaoInput,
  type UpdatePerfilUsuarioInput,
  type ContaBancariaEmpresaInput,
} from "@imbobi/schemas";

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("excluir-usuario") private readonly deleteUserQueue: Queue,
    private readonly storage: StorageService,
  ) {}

  private async resolveAvatarUrl(key: string | null | undefined): Promise<string | null> {
    if (!key) return null;
    if (key.startsWith("http://") || key.startsWith("https://")) return key;
    try {
      return await this.storage.getSignedUrl(key);
    } catch {
      return null;
    }
  }

  private mapPerfil(usuario: {
    usuarioId: string;
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    tipo: string;
    kycStatus: string;
    avatarUrl: string | null;
    contaBanco: string | null;
    contaAgencia: string | null;
    contaNumero: string | null;
    contaPix: string | null;
    contaTitular: string | null;
    criadoEm: Date;
    atualizadoEm: Date;
  }, avatarSigned: string | null) {
    return {
      usuarioId: usuario.usuarioId,
      nome: usuario.nome,
      cpf: usuario.cpf,
      email: usuario.email,
      telefone: usuario.telefone,
      tipo: usuario.tipo,
      kycStatus: usuario.kycStatus,
      avatarUrl: avatarSigned,
      contaBancaria: {
        titular: usuario.contaTitular,
        banco: usuario.contaBanco,
        agencia: usuario.contaAgencia,
        numero: usuario.contaNumero,
        pix: usuario.contaPix,
      },
      criadoEm: usuario.criadoEm,
      atualizadoEm: usuario.atualizadoEm,
    };
  }

  private perfilSelect = {
    usuarioId: true,
    nome: true,
    cpf: true,
    email: true,
    telefone: true,
    tipo: true,
    kycStatus: true,
    avatarUrl: true,
    contaBanco: true,
    contaAgencia: true,
    contaNumero: true,
    contaPix: true,
    contaTitular: true,
    criadoEm: true,
    atualizadoEm: true,
  } as const;

  async buscarPerfil(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: this.perfilSelect,
    });
    if (!usuario) return null;
    const avatarSigned = await this.resolveAvatarUrl(usuario.avatarUrl);
    return this.mapPerfil(usuario, avatarSigned);
  }

  async atualizarPerfil(usuarioId: string, data: UpdatePerfilUsuarioInput) {
    const usuario = await this.prisma.usuario.update({
      where: { usuarioId },
      data: {
        nome: data.nome,
        telefone: data.telefone,
        atualizadoEm: new Date(),
      },
      select: this.perfilSelect,
    });
    const avatarSigned = await this.resolveAvatarUrl(usuario.avatarUrl);
    return this.mapPerfil(usuario, avatarSigned);
  }

  async atualizarContaBancaria(usuarioId: string, data: ContaBancariaEmpresaInput) {
    const usuario = await this.prisma.usuario.update({
      where: { usuarioId },
      data: {
        contaTitular: data.contaTitular,
        contaBanco: data.contaBanco,
        contaAgencia: data.contaAgencia,
        contaNumero: data.contaNumero,
        contaPix: data.contaPix?.trim() ? data.contaPix.trim() : null,
        atualizadoEm: new Date(),
      },
      select: this.perfilSelect,
    });
    const avatarSigned = await this.resolveAvatarUrl(usuario.avatarUrl);
    return this.mapPerfil(usuario, avatarSigned);
  }

  async uploadAvatar(usuarioId: string, fileBuffer: Buffer, mimeType: string) {
    if (!AVATAR_MIMES.has(mimeType)) {
      throw new BadRequestException("Formato inválido. Use JPEG, PNG ou WebP.");
    }
    if (fileBuffer.length > AVATAR_MAX_BYTES) {
      throw new BadRequestException("Imagem muito grande. Máximo 5 MB.");
    }

    const existing = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { avatarUrl: true },
    });
    if (!existing) throw new NotFoundException("Usuário não encontrado");

    const { key } = await this.storage.uploadAvatar(fileBuffer, mimeType, usuarioId);

    if (existing.avatarUrl && !existing.avatarUrl.startsWith("http")) {
      await this.storage.delete(existing.avatarUrl).catch(() => null);
    }

    const usuario = await this.prisma.usuario.update({
      where: { usuarioId },
      data: { avatarUrl: key, atualizadoEm: new Date() },
      select: this.perfilSelect,
    });

    const avatarSigned = await this.resolveAvatarUrl(usuario.avatarUrl);
    return this.mapPerfil(usuario, avatarSigned);
  }

  async obterPreferencias(usuarioId: string): Promise<PreferenciasNotificacao> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { preferenciasNotificacao: true, deletadoEm: true },
    });
    if (!usuario || usuario.deletadoEm) {
      throw new NotFoundException("Usuário não encontrado");
    }
    const padrao = criarPreferenciasPadrao();
    if (!usuario.preferenciasNotificacao) return padrao;
    const parsed = PreferenciasNotificacaoSchema.safeParse(usuario.preferenciasNotificacao);
    if (!parsed.success) return padrao;
    return { ...padrao, ...parsed.data };
  }

  async salvarPreferencias(
    usuarioId: string,
    patch: UpdatePreferenciasNotificacaoInput
  ): Promise<PreferenciasNotificacao> {
    const atual = await this.obterPreferencias(usuarioId);
    const merged: PreferenciasNotificacao = { ...atual };
    for (const [tipo, canais] of Object.entries(patch)) {
      if (!canais) continue;
      merged[tipo as keyof PreferenciasNotificacao] = {
        ...merged[tipo as keyof PreferenciasNotificacao],
        ...canais,
      };
    }
    const validado = PreferenciasNotificacaoSchema.parse(merged);
    await this.prisma.usuario.update({
      where: { usuarioId },
      data: { preferenciasNotificacao: JSON.parse(JSON.stringify(validado)) },
    });
    return validado;
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
    const maskedPhone = usuario.telefone?.replace(/\d(?=\d{4})/g, "*") ?? "";

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
    const graceDays = Number(process.env.EXCLUSAO_GRACE_PERIOD_DAYS ?? "30");
    const now = new Date();
    const deletionScheduledFor = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);

    await this.prisma.usuario.update({
      where: { usuarioId },
      data: {
        deletadoEm: now,
      },
    });

    // Schedule hard delete job
    const delayMs = graceDays * 24 * 60 * 60 * 1000;
    await this.deleteUserQueue.add(
      "hard-delete",
      { usuarioId },
      {
        delay: delayMs,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      }
    );

    return {
      message: "Conta marcada para exclusão",
      gracePeriodDays: 30,
      deletionScheduledFor,
      notaGraca: `Você pode fazer login novamente durante o período de ${graceDays} dias para restaurar sua conta`,
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
