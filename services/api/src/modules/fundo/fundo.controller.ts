import { Controller, Get, UseGuards } from "@nestjs/common";
import { FundoService } from "./fundo.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("fundo")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("GESTOR_FUNDO", "ADMIN")
export class FundoController {
  constructor(private readonly fundo: FundoService) {}

  @Get("overview")
  overview() { return this.fundo.overview(); }

  @Get("carteira")
  carteira() { return this.fundo.carteira(); }

  @Get("fluxo-caixa")
  fluxoCaixa() { return this.fundo.fluxoCaixa(); }
}
