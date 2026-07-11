import { Module } from "@nestjs/common";
import { DocumentosService } from "./documentos.service";
import { DocumentosController } from "./documentos.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [DocumentosService],
  controllers: [DocumentosController],
  exports: [DocumentosService],
})
export class DocumentosModule {}
