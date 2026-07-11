import { Controller, Get, UseGuards } from "@nestjs/common";
import { ManagerService } from "./manager.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("manager")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("FUNDO", "ADMIN")
export class ManagerController {
  constructor(private readonly manager: ManagerService) {}

  @Get("dashboard")
  dashboard() {
    return this.manager.dashboard();
  }
}
