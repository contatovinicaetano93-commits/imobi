import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { WebhooksService } from "./webhooks.service";
import { WebhooksController } from "./webhooks.controller";

@Module({
  imports: [PrismaModule],
  providers: [WebhooksService],
  controllers: [WebhooksController],
  exports: [WebhooksService],
})
export class WebhooksModule {}
