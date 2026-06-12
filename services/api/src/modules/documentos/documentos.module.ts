import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { DocumentosController } from "./documentos.controller";
import { DocumentosService } from "./documentos.service";

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [DocumentosController],
  providers: [DocumentosService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
