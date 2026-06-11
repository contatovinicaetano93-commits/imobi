import { Controller, Get, Post, Query, Body, UseGuards } from "@nestjs/common";
import { AdminService, CriarUsuarioAdminDto } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("overview")
  overview() {
    return this.adminService.overview();
  }

  @Get("atividades")
  atividades(@Query("limit") limit: string = "8") {
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 50);
    return this.adminService.atividades(parsedLimit);
  }

  @Get("usuarios")
  listarUsuarios() {
    return this.adminService.listarUsuarios();
  }

  @Post("usuarios")
  criarUsuario(@Body() body: CriarUsuarioAdminDto) {
    return this.adminService.criarUsuario(body);
  }
}
