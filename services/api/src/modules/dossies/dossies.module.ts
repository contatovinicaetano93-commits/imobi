import { Module } from "@nestjs/common";
import { DossiesController } from "./dossies.controller";
import { DossiesService } from "./dossies.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [DossiesController],
  providers: [DossiesService],
  exports: [DossiesService],
})
export class DossiesModule {}
