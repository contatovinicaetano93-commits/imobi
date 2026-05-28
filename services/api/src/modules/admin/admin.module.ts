import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AuditService } from "../../common/services/audit.service";
import { ExportService } from "../../common/services/export.service";
import { PdfExportService } from "../../common/services/pdf-export.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService, AuditService, ExportService, PdfExportService],
  exports: [AdminService, AuditService, ExportService, PdfExportService],
})
export class AdminModule {}
