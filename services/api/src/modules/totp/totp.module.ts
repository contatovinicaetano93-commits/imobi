import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TotpService } from "./totp.service";
import { TotpController } from "./totp.controller";

@Module({
  imports: [PrismaModule],
  providers: [TotpService],
  controllers: [TotpController],
  exports: [TotpService],
})
export class TotpModule {}
