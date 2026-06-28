import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PipelineService } from "./pipeline.service";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailModule } from "../email/email.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { ComiteModule } from "../comite/comite.module";
import { CreditoModule } from "../credito/credito.module";
import { ConfiguracoesService } from "./configuracoes.service";

@Module({
  imports: [PrismaModule, EmailModule, NotificacoesModule, ComiteModule, CreditoModule],
  controllers: [AdminController],
  providers: [AdminService, PipelineService, ConfiguracoesService],
  exports: [ConfiguracoesService],
})
export class AdminModule {}
