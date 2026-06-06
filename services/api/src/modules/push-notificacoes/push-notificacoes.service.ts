import { Injectable, Logger } from "@nestjs/common";
import * as admin from "firebase-admin";
import { PrismaService } from "../prisma/prisma.service";

interface PushPayload {
  usuarioId: string;
  titulo: string;
  mensagem: string;
  tipo: "ETAPA_APROVADA" | "PARCELA_LIBERADA" | "KYC_APROVADO" | "KYC_REJEITADO" | "GERAL";
  dados?: Record<string, string>;
}

interface PushTemplate {
  titulo: string;
  mensagem: string;
  tipo: PushPayload["tipo"];
}

@Injectable()
export class PushNotificacoesService {
  private readonly logger = new Logger(PushNotificacoesService.name);
  private messaging: admin.messaging.Messaging;

  private readonly templates: Record<string, (data: Record<string, string>) => PushTemplate> = {
    ETAPA_APROVADA: (data) => ({
      titulo: "Etapa Aprovada!",
      mensagem: `Sua etapa "${data.etapaNome}" de "${data.obraNome}" foi aprovada!`,
      tipo: "ETAPA_APROVADA",
    }),
    PARCELA_LIBERADA: (data) => ({
      titulo: "Parcela Liberada",
      mensagem: `Parcela de R$ ${data.valor} foi liberada em sua conta para "${data.obraNome}"`,
      tipo: "PARCELA_LIBERADA",
    }),
    KYC_APROVADO: (data) => ({
      titulo: "Validação Aprovada!",
      mensagem: "Sua validação de identidade (KYC) foi aprovada com sucesso!",
      tipo: "KYC_APROVADO",
    }),
    KYC_REJEITADO: (data) => ({
      titulo: "Documento Rejeitado",
      mensagem: `Sua validação foi rejeitada. Motivo: ${data.motivo}`,
      tipo: "KYC_REJEITADO",
    }),
  };

  constructor(private readonly prisma: PrismaService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env["FIREBASE_PROJECT_ID"],
            privateKey: process.env["FIREBASE_PRIVATE_KEY"]?.replace(/\\n/g, "\n"),
            clientEmail: process.env["FIREBASE_CLIENT_EMAIL"],
          } as admin.ServiceAccount),
        });
      }
      this.messaging = admin.messaging();
      this.logger.debug("Firebase initialized");
    } catch (error) {
      this.logger.warn(`Firebase not configured: ${error}`);
      this.messaging = null;
    }
  }

  getTemplate(tipo: PushPayload["tipo"], data?: Record<string, string>): PushTemplate {
    const templateFn = this.templates[tipo];
    if (!templateFn) {
      return {
        titulo: "Notificação",
        mensagem: "Você tem uma nova notificação",
        tipo: "GERAL",
      };
    }
    return templateFn(data || {});
  }

  async enviarPush(payload: PushPayload): Promise<boolean> {
    if (!this.messaging) {
      this.logger.debug(`[PUSH-CONSOLE] ${payload.usuarioId} - ${payload.titulo} - ${payload.mensagem}`);
      return true;
    }

    const tokens = await this.prisma.usuarioFcmToken.findMany({
      where: { usuarioId: payload.usuarioId, ativo: true },
      select: { token: true },
    });

    if (tokens.length === 0) {
      this.logger.debug(`No active FCM tokens found for user ${payload.usuarioId}`);
      return true;
    }

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: payload.titulo,
        body: payload.mensagem,
      },
      data: {
        tipo: payload.tipo,
        ...(payload.dados || {}),
      },
      tokens: tokens.map((t) => t.token),
    };

    try {
      const response = await this.messaging.sendEachForMulticast(message);
      this.logger.debug(`Push enviado para ${response.successCount}/${tokens.length} dispositivos (tipo: ${payload.tipo})`);

      // Desativa tokens que falharam
      const failedTokens = response.responses
        .map((r, idx) => ({
          success: r.success,
          token: tokens[idx].token,
        }))
        .filter((r) => !r.success)
        .map((r) => r.token);

      if (failedTokens.length > 0) {
        await this.prisma.usuarioFcmToken.updateMany({
          where: { token: { in: failedTokens } },
          data: { ativo: false },
        });
        this.logger.debug(`Desativados ${failedTokens.length} tokens inválidos`);
      }

      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar push: ${error}`);
      return false;
    }
  }

  async registrarToken(usuarioId: string, token: string): Promise<void> {
    await this.prisma.usuarioFcmToken.upsert({
      where: { usuarioId_token: { usuarioId, token } },
      create: { usuarioId, token, ativo: true },
      update: { ativo: true, atualizadoEm: new Date() },
    });
    this.logger.debug(`FCM token registrado para user ${usuarioId}`);
  }

  async desregistrarToken(usuarioId: string, token: string): Promise<void> {
    await this.prisma.usuarioFcmToken.updateMany({
      where: { usuarioId, token },
      data: { ativo: false },
    });
    this.logger.debug(`FCM token desativado para user ${usuarioId}`);
  }
}
