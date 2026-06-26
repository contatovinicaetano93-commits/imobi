import { Module } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { TelegramAiService } from "./telegram-ai.service";
import { TelegramController } from "./telegram.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramAiService],
  exports: [TelegramService],
})
export class TelegramModule {}
