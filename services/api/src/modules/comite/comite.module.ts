import { Module } from "@nestjs/common";
import { ComiteController } from "./comite.controller";
import { ComiteService } from "./comite.service";
import { PrismaModule } from "../prisma/prisma.module";
import { FluxoModule } from "../fluxo/fluxo.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [PrismaModule, FluxoModule, NotificacoesModule, EmailModule],
  controllers: [ComiteController],
  providers: [ComiteService],
})
export class ComiteModule {}
