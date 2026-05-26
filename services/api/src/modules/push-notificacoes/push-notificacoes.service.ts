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

@Injectable()
export class PushNotificacoesService {
  private readonly logger = new Logger(PushNotificacoesService.name);
  private messaging: admin.messaging.Messaging;

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

  async enviarPush(payload: PushPayload): Promise<boolean> {
    if (!this.messaging) {
      this.logger.debug(`[PUSH-CONSOLE] ${payload.usuarioId} - ${payload.titulo}`);
      return true;
    }

    const tokens = await this.prisma.usuarioFcmToken.findMany({
      where: { usuarioId: payload.usuarioId, ativo: true },
      select: { token: true },
    });

    if (tokens.length === 0) return true;

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
      this.logger.debug(`Push enviado para ${response.successCount} dispositivos`);

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
  }

  async desregistrarToken(usuarioId: string, token: string): Promise<void> {
    await this.prisma.usuarioFcmToken.update({
      where: { usuarioId_token: { usuarioId, token } },
      data: { ativo: false },
    });
  }
}
