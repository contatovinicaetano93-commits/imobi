import { Module } from "@nestjs/common";
import { ComiteController } from "./comite.controller";
import { ComiteService } from "./comite.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ComiteController],
  providers: [ComiteService],
})
export class ComiteModule {}
