import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailModule } from "../email/email.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";

@Module({
  imports: [PrismaModule, EmailModule, NotificacoesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
