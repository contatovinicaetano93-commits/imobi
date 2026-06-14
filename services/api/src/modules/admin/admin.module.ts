import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { EmailModule } from "../email/email.module";
import { PushNotificacoesModule } from "../push-notificacoes/push-notificacoes.module";
import { QUEUE_LIBERACAO } from "../../common/constants";

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: QUEUE_LIBERACAO }),
    NotificacoesModule,
    EmailModule,
    PushNotificacoesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
