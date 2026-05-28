import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AuditService } from "../../common/services/audit.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService, AuditService],
  exports: [AdminService, AuditService],
})
export class AdminModule {}
