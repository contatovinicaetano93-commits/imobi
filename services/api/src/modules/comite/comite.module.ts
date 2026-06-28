import { Module } from "@nestjs/common";
import { ComiteController } from "./comite.controller";
import { ComiteService } from "./comite.service";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { EmailModule } from "../email/email.module";
import { PushNotificacoesModule } from "../push-notificacoes/push-notificacoes.module";
import { JornadaModule } from "../jornada/jornada.module";

@Module({
  imports: [PrismaModule, NotificacoesModule, EmailModule, PushNotificacoesModule, JornadaModule],
  controllers: [ComiteController],
  providers: [ComiteService],
  exports: [ComiteService],
})
export class ComiteModule {}
