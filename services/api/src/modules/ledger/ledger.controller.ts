import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { LedgerService } from "./ledger.service";

@ApiTags("Ledger")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard)
@Controller("ledger")
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get("credito/:creditoId/extrato")
  extrato(
    @Param("creditoId") creditoId: string,
    @Query("take") take?: string,
  ) {
    return this.ledger.extratoPorCredito(creditoId, take ? Number(take) : 50);
  }

  /** Cursor-based pagination — use `nextCursor` from previous response as `cursor` query param. */
  @Get("credito/:creditoId/extrato/cursor")
  extratoCursor(
    @Param("creditoId") creditoId: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    return this.ledger.extratoCursor(creditoId, cursor, take ? Number(take) : 20);
  }

  @Get("usuario/meu-extrato")
  meuExtrato(@UsuarioAtual() u: IUsuario) {
    return this.ledger.extratoPorUsuario(u.id);
  }

  @UseGuards(RolesGuard)
  @Roles("ADMIN", "GESTOR_FUNDO")
  @Get("credito/:creditoId/consistencia")
  consistencia(@Param("creditoId") creditoId: string) {
    return this.ledger.verificarConsistencia(creditoId);
  }
}
