import { Module } from "@nestjs/common";
import { ComiteController } from "./comite.controller";
import { ComiteService } from "./comite.service";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";

@Module({
  imports: [PrismaModule, NotificacoesModule],
  controllers: [ComiteController],
  providers: [ComiteService],
})
export class ComiteModule {}
