import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { PrismaModule } from "../prisma/prisma.module";
import { CreditoController } from "./credito.controller";
import { CreditoService } from "./credito.service";
import { LiberacaoService } from "./liberacao.service";
import { QUEUE_LIBERACAO } from "../../common/constants";

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: QUEUE_LIBERACAO }),
  ],
  controllers: [CreditoController],
  providers: [CreditoService, LiberacaoService],
  exports: [CreditoService],
})
export class CreditoModule {}
