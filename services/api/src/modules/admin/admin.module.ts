import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PrismaModule } from "../prisma/prisma.module";
import { QUEUE_LIBERACAO, QUEUE_EMAIL } from "../../common/constants";
import { QUEUE_EXCLUIR_USUARIO } from "../../workers/excluir-usuario.worker";

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue(
      { name: QUEUE_LIBERACAO },
      { name: QUEUE_EMAIL },
      { name: QUEUE_EXCLUIR_USUARIO },
    ),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
