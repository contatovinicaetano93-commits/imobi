import { Module } from "@nestjs/common";
import { PropostasController } from "./propostas.controller";
import { PropostasService } from "./propostas.service";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { EmailModule } from "../email/email.module";
import { DossiesModule } from "../dossies/dossies.module";

@Module({
  imports: [PrismaModule, StorageModule, EmailModule, DossiesModule],
  controllers: [PropostasController],
  providers: [PropostasService],
  exports: [PropostasService],
})
export class PropostasModule {}
