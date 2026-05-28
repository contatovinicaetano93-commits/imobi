import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Response,
  BadRequestException,
  UseInterceptors,
} from "@nestjs/common";
import { Response as ExpressResponse } from "express";
import { AdminService } from "./admin.service";
import { ExportService } from "../../common/services/export.service";
import { PdfExportService } from "../../common/services/pdf-export.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ThrottlerGuard } from "@nestjs/throttler";
import {
  UsuarioAtual,
  type UsuarioAtual as IUsuario,
} from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
@Roles("ADMIN", "GESTOR_OBRA")
@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly exportService: ExportService,
    private readonly pdfExportService: PdfExportService,
  ) {}

  // ── User Management ──────────────────────────────────────

  @Get("users")
  async listUsers(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
    @Query("tipo") tipo?: string,
    @Query("bloqueado") bloqueado?: string,
    @Query("kycStatus") kycStatus?: string,
  ) {
    const filtro = {
      tipo,
      bloqueado: bloqueado === "true",
      kycStatus,
    };

    return this.adminService.listUsers(
      parseInt(page, 10),
      parseInt(limit, 10),
      filtro,
    );
  }

  @Patch("users/:id/block")
  async blockUser(
    @Param("id") usuarioId: string,
    @UsuarioAtual() admin: IUsuario,
    @Body() body: { motivo?: string },
  ) {
    await this.adminService.blockUser({
      usuarioId,
      adminId: admin.id,
      motivo: body.motivo,
    });
    return { message: "Usuário bloqueado com sucesso" };
  }

  @Patch("users/:id/unlock")
  async unblockUser(
    @Param("id") usuarioId: string,
    @UsuarioAtual() admin: IUsuario,
  ) {
    await this.adminService.unblockUser({
      usuarioId,
      adminId: admin.id,
    });
    return { message: "Usuário desbloqueado com sucesso" };
  }

  // ── KYC Management ──────────────────────────────────────

  @Get("kyc/pending")
  async listPendingKyc(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
  ) {
    return this.adminService.listPendingKyc(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Post("kyc/bulk-approve")
  async bulkApproveKyc(
    @Body() body: { documentIds: string[] },
    @UsuarioAtual() admin: IUsuario,
  ) {
    return this.adminService.bulkApproveKyc({
      documentIds: body.documentIds,
      adminId: admin.id,
    });
  }

  @Post("kyc/bulk-reject")
  async bulkRejectKyc(
    @Body() body: { documentIds: string[]; motivo: string },
    @UsuarioAtual() admin: IUsuario,
  ) {
    return this.adminService.bulkRejectKyc({
      documentIds: body.documentIds,
      motivo: body.motivo,
      adminId: admin.id,
    });
  }

  // ── Credit Management ────────────────────────────────────

  @Post("credits/approve")
  async approveCredit(
    @Body()
    body: {
      creditoId: string;
      valorAprovado: number;
      prazoMeses: number;
      taxaMensal?: number;
    },
    @UsuarioAtual() admin: IUsuario,
  ) {
    await this.adminService.approveCredit({
      creditoId: body.creditoId,
      adminId: admin.id,
      valorAprovado: body.valorAprovado,
      prazoMeses: body.prazoMeses,
      taxaMensal: body.taxaMensal,
    });
    return { message: "Crédito aprovado com sucesso" };
  }

  @Post("credits/reject")
  async rejectCredit(
    @Body() body: { creditoId: string; motivo: string },
    @UsuarioAtual() admin: IUsuario,
  ) {
    await this.adminService.rejectCredit({
      creditoId: body.creditoId,
      adminId: admin.id,
      motivo: body.motivo,
    });
    return { message: "Crédito rejeitado com sucesso" };
  }

  // ── Stage Management ────────────────────────────────────

  @Post("stages/bulk-approve")
  async bulkApproveStages(
    @Body() body: { etapaIds: string[] },
    @UsuarioAtual() admin: IUsuario,
  ) {
    return this.adminService.bulkApproveStages({
      etapaIds: body.etapaIds,
      adminId: admin.id,
    });
  }

  // ── Dashboard Stats ──────────────────────────────────────

  @Get("stats")
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ── Audit Logs ───────────────────────────────────────────

  @Get("audit-logs")
  async getAuditLogs(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "50",
    @Query("usuarioId") usuarioId?: string,
    @Query("acao") acao?: string,
  ) {
    return this.adminService.getAuditLogs(
      parseInt(page, 10),
      parseInt(limit, 10),
      usuarioId,
      acao,
    );
  }

  // ── Data Export ──────────────────────────────────────

  @Get("export/users.csv")
  async exportUsersCsv(
    @Response() res: ExpressResponse,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("kycStatus") kycStatus?: string,
  ) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const stream = await this.exportService.exportUsersToCSV({
        startDate: start,
        endDate: end,
        kycStatus,
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="usuarios-${Date.now()}.csv"`
      );

      stream.pipe(res);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Erro ao exportar usuários"
      );
    }
  }

  @Get("export/obras.csv")
  async exportObrasCsv(
    @Response() res: ExpressResponse,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("status") status?: string,
  ) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const stream = await this.exportService.exportObrasToCSV({
        startDate: start,
        endDate: end,
        status,
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="obras-${Date.now()}.csv"`
      );

      stream.pipe(res);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Erro ao exportar obras"
      );
    }
  }

  @Get("export/creditos.csv")
  async exportCreditosCsv(
    @Response() res: ExpressResponse,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("status") status?: string,
  ) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const stream = await this.exportService.exportCreditosToCSV({
        startDate: start,
        endDate: end,
        status,
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="creditos-${Date.now()}.csv"`
      );

      stream.pipe(res);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Erro ao exportar créditos"
      );
    }
  }

  @Get("export/evidencias.csv")
  async exportEvidenciasCsv(
    @Response() res: ExpressResponse,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const stream = await this.exportService.exportEvidenciasToCSV({
        startDate: start,
        endDate: end,
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="evidencias-${Date.now()}.csv"`
      );

      stream.pipe(res);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Erro ao exportar evidências"
      );
    }
  }

  @Get("export/kyc-documentos.csv")
  async exportKycDocumentosCsv(
    @Response() res: ExpressResponse,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("status") status?: string,
  ) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const stream = await this.exportService.exportKycDocumentosToCSV({
        startDate: start,
        endDate: end,
        status,
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="kyc-documentos-${Date.now()}.csv"`
      );

      stream.pipe(res);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Erro ao exportar documentos KYC"
      );
    }
  }

  // ── PDF Export ───────────────────────────────────────

  @Get("export/relatorio-obra/:obraId.pdf")
  async exportRelatorioObraPdf(
    @Param("obraId") obraId: string,
    @Response() res: ExpressResponse,
  ) {
    try {
      const pdf = await this.pdfExportService.generateObraRelatorioPDF(obraId);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="relatorio-obra-${obraId}.pdf"`
      );

      res.send(pdf);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Erro ao gerar relatório"
      );
    }
  }

  @Get("export/contrato-credito/:creditoId.pdf")
  async exportContratoCredidoPdf(
    @Param("creditoId") creditoId: string,
    @Response() res: ExpressResponse,
  ) {
    try {
      const pdf = await this.pdfExportService.generateCreditoContratoPDF(creditoId);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="contrato-credito-${creditoId}.pdf"`
      );

      res.send(pdf);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Erro ao gerar contrato"
      );
    }
  }

  @Get("export/comprovante-kyc/:usuarioId.pdf")
  async exportComprovanteKycPdf(
    @Param("usuarioId") usuarioId: string,
    @Response() res: ExpressResponse,
  ) {
    try {
      const pdf = await this.pdfExportService.generateKycComprovantePDF(usuarioId);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="comprovante-kyc-${usuarioId}.pdf"`
      );

      res.send(pdf);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Erro ao gerar comprovante"
      );
    }
  }
}
