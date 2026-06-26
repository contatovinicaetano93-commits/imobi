import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import { PrismaService } from "../prisma/prisma.service";
import { TelegramAiService } from "./telegram-ai.service";

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  readonly bot: Telegraf;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ai: TelegramAiService,
  ) {
    const token = this.config.get<string>("TELEGRAM_BOT_TOKEN");
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN não configurado");
    this.bot = new Telegraf(token);
  }

  async onModuleInit() {
    this.registrarComandos();

    const webhookUrl = this.config.get<string>("TELEGRAM_WEBHOOK_URL");
    const secret = this.config.get<string>("TELEGRAM_WEBHOOK_SECRET");

    if (webhookUrl) {
      await this.bot.telegram.setWebhook(`${webhookUrl}/telegram/webhook`, {
        secret_token: secret,
      });
      this.logger.log(`Webhook Telegram configurado: ${webhookUrl}/telegram/webhook`);
    } else {
      // Modo polling para desenvolvimento
      this.bot.launch().catch((err) => this.logger.error("Erro ao iniciar polling", err));
      this.logger.log("Telegram bot iniciado em modo polling (desenvolvimento)");
    }
  }

  async onModuleDestroy() {
    this.bot.stop("SIGTERM");
  }

  private registrarComandos() {
    this.bot.start((ctx) => this.handleStart(ctx));
    this.bot.command("ajuda", (ctx) => this.handleAjuda(ctx));
    this.bot.command("obras", (ctx) => this.handleComandoRapido(ctx, "Liste minhas obras com status"));
    this.bot.command("credito", (ctx) => this.handleComandoRapido(ctx, "Mostre minha situação de crédito"));
    this.bot.command("notificacoes", (ctx) => this.handleComandoRapido(ctx, "Mostre minhas notificações não lidas"));
    this.bot.command("resumo", (ctx) => this.handleComandoRapido(ctx, "Faça um resumo geral da minha conta"));
    this.bot.on(message("text"), (ctx) => this.handleMensagem(ctx));
  }

  private async handleStart(ctx: Context) {
    const telegramId = ctx.from?.id.toString();
    const primeiroNome = ctx.from?.first_name ?? "usuário";

    const vinculo = await this.buscarVinculo(telegramId);

    if (!vinculo) {
      await ctx.reply(
        `Olá, ${primeiroNome}! 👋\n\n` +
        `Sou a *Secretária Virtual iMobi*. Para começar, preciso vincular sua conta.\n\n` +
        `Por favor, envie o e-mail cadastrado na plataforma para eu identificá-lo:`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    await ctx.reply(
      `Olá de volta, *${vinculo.nome}*! ✨\n\n` +
      `Sou sua secretária virtual. Como posso ajudar?\n\n` +
      `Use /ajuda para ver os comandos disponíveis.`,
      { parse_mode: "Markdown" },
    );
  }

  private async handleAjuda(ctx: Context) {
    await ctx.reply(
      `*Comandos disponíveis:*\n\n` +
      `/obras — Listar suas obras\n` +
      `/credito — Situação do crédito\n` +
      `/notificacoes — Notificações não lidas\n` +
      `/resumo — Resumo geral da conta\n` +
      `/ajuda — Mostrar esta mensagem\n\n` +
      `_Você também pode me enviar qualquer pergunta em texto livre!_`,
      { parse_mode: "Markdown" },
    );
  }

  private async handleComandoRapido(ctx: Context, pergunta: string) {
    const usuario = await this.autenticar(ctx);
    if (!usuario) return;

    await ctx.sendChatAction("typing");
    const resposta = await this.ai.responder(usuario.usuarioId, usuario.nome, pergunta);
    await ctx.reply(resposta, { parse_mode: "Markdown" });
  }

  async handleMensagem(ctx: Context & { message: { text: string } }) {
    const telegramId = ctx.from?.id.toString();
    const texto = ctx.message.text;

    // Verifica se é um e-mail para vinculação
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) {
      await this.processarVinculacao(ctx, texto);
      return;
    }

    const usuario = await this.autenticar(ctx);
    if (!usuario) return;

    await ctx.sendChatAction("typing");

    try {
      const resposta = await this.ai.responder(usuario.usuarioId, usuario.nome, texto);
      await ctx.reply(resposta, { parse_mode: "Markdown" });
    } catch (err) {
      this.logger.error("Erro ao processar mensagem", err);
      await ctx.reply("Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.");
    }
  }

  private async processarVinculacao(ctx: Context, email: string) {
    const telegramId = ctx.from?.id.toString();

    const usuario = await this.prisma.usuario.findFirst({
      where: { email: email.toLowerCase() },
      select: { usuarioId: true, nome: true, email: true },
    });

    if (!usuario) {
      await ctx.reply(
        `Não encontrei nenhuma conta com o e-mail *${email}*.\n\n` +
        `Verifique se o e-mail está correto ou cadastre-se na plataforma iMobi.`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    await this.prisma.usuario.update({
      where: { usuarioId: usuario.usuarioId },
      data: { telegramChatId: telegramId },
    });

    await ctx.reply(
      `✅ Conta vinculada com sucesso!\n\n` +
      `Olá, *${usuario.nome}*! Agora posso te ajudar com suas obras e crédito.\n\n` +
      `Use /ajuda para ver os comandos disponíveis.`,
      { parse_mode: "Markdown" },
    );
  }

  private async autenticar(ctx: Context): Promise<{ usuarioId: string; nome: string } | null> {
    const telegramId = ctx.from?.id.toString();
    const vinculo = await this.buscarVinculo(telegramId);

    if (!vinculo) {
      await ctx.reply(
        `Você ainda não vinculou sua conta iMobi.\n\n` +
        `Envie o e-mail cadastrado na plataforma para começar.`,
      );
      return null;
    }

    return vinculo;
  }

  private async buscarVinculo(telegramId?: string): Promise<{ usuarioId: string; nome: string } | null> {
    if (!telegramId) return null;

    return this.prisma.usuario.findFirst({
      where: { telegramChatId: telegramId },
      select: { usuarioId: true, nome: true },
    });
  }

  // Chamado pelo controller no modo webhook
  async processarUpdate(update: unknown, secret?: string): Promise<void> {
    const expectedSecret = this.config.get<string>("TELEGRAM_WEBHOOK_SECRET");
    if (expectedSecret && secret !== expectedSecret) {
      throw new Error("Token de webhook inválido");
    }
    await this.bot.handleUpdate(update as Parameters<typeof this.bot.handleUpdate>[0]);
  }

  async notificarUsuario(telegramChatId: string, mensagem: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(telegramChatId, mensagem, { parse_mode: "Markdown" });
    } catch (err) {
      this.logger.error(`Erro ao notificar usuário ${telegramChatId}`, err);
    }
  }
}
