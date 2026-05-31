import { Controller, Get, UseGuards, ForbiddenException } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard")
  dashboard(@UsuarioAtual() u: IUsuario) {
    if (u.tipo !== "ADMIN") {
      throw new ForbiddenException("Apenas administradores podem acessar esta rota");
    }
    return this.admin.obterDashboard();
  }
}
