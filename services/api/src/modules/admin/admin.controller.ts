import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("filas")
  filas() {
    return this.admin.filas();
  }

  @Get("tranches/pendentes-liberacao")
  tranchesPendentesLiberacao() {
    return this.admin.tranchesPendentesLiberacao();
  }
}
