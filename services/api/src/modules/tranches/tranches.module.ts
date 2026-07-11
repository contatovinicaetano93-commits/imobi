import { Module } from "@nestjs/common";
import { TranchesService } from "./tranches.service";
import { TranchesController } from "./tranches.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [TranchesService],
  controllers: [TranchesController],
  exports: [TranchesService],
})
export class TranchesModule {}
