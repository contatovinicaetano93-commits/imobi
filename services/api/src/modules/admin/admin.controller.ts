import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  UsuarioAtual,
  type UsuarioAtual as IUsuario,
} from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
