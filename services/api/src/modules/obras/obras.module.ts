import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CacheService } from "../../cache.service";
import { ObrasController } from "./obras.controller";
import { ObrasService } from "./obras.service";

@Module({
  imports: [PrismaModule],
  controllers: [ObrasController],
  providers: [ObrasService, CacheService],
  exports: [ObrasService],
})
export class ObrasModule {}
