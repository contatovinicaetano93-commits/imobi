import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { EmailService } from "./email.service";
import { EmailQueueService } from "./email-queue.service";
import { QUEUE_EMAIL } from "../../common/constants";

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_EMAIL })],
  providers: [EmailService, EmailQueueService],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
