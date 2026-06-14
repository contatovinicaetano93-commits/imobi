import { Module } from "@nestjs/common";
import { FundoController } from "./fundo.controller";
import { FundoService } from "./fundo.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [FundoController],
  providers: [FundoService],
})
export class FundoModule {}
