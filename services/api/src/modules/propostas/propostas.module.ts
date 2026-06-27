import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { PropostasController } from "./propostas.controller";
import { PropostasService } from "./propostas.service";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { DossiesModule } from "../dossies/dossies.module";
import { QUEUE_PROPOSTA_NOTIFY } from "../../common/constants";

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    DossiesModule,
    BullModule.registerQueue({ name: QUEUE_PROPOSTA_NOTIFY }),
  ],
  controllers: [PropostasController],
  providers: [PropostasService],
  exports: [PropostasService],
})
export class PropostasModule {}
