import { Controller, Get, UseGuards, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Dashboard administrativo", description: "Retorna estatísticas e métricas do sistema (apenas admins)" })
  @ApiResponse({ status: 200, description: "Dashboard carregado com sucesso" })
  @ApiResponse({ status: 403, description: "Acesso negado - permissão de admin necessária" })
  dashboard(@UsuarioAtual() u: IUsuario) {
    if (u.tipo !== "ADMIN") {
      throw new ForbiddenException("Apenas administradores podem acessar esta rota");
    }
    return this.admin.obterDashboard();
  }
}
