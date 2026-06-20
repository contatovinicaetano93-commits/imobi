import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { ComiteController } from "./comite.controller";
import { ComiteService } from "./comite.service";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { EmailModule } from "../email/email.module";
import { QUEUE_EMAIL } from "../../common/constants";

@Module({
  imports: [
    PrismaModule,
    NotificacoesModule,
    EmailModule,
    BullModule.registerQueue({ name: QUEUE_EMAIL }),
  ],
  controllers: [ComiteController],
  providers: [ComiteService],
})
export class ComiteModule {}
