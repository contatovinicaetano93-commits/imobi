import { Controller, Post, Body, Headers, HttpCode, HttpStatus, UnauthorizedException, Logger } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { ConfigService } from "@nestjs/config";

@Controller("telegram")
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly config: ConfigService,
  ) {}

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Body() body: unknown,
    @Headers("x-telegram-bot-api-secret-token") secret: string,
  ) {
    const expectedSecret = this.config.get<string>("TELEGRAM_WEBHOOK_SECRET");

    if (expectedSecret && secret !== expectedSecret) {
      this.logger.warn("Webhook recebido com token inválido");
      throw new UnauthorizedException("Token inválido");
    }

    await this.telegramService.processarUpdate(body, secret);
    return { ok: true };
  }
}
