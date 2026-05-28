import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { WebhookService } from "./webhook.service";
import { WebhookController } from "./webhook.controller";
import { WebhookProcessor, QUEUE_WEBHOOKS } from "./webhook.processor";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_WEBHOOKS,
    }),
    PrismaModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookProcessor],
  exports: [WebhookService],
})
export class WebhookModule {}
