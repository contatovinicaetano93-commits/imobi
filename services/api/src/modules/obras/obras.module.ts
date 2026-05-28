import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ObrasController } from "./obras.controller";
import { ObrasService } from "./obras.service";

@Module({
  imports: [PrismaModule],
  controllers: [ObrasController],
  providers: [ObrasService],
  exports: [ObrasService],
})
export class ObrasModule {}
