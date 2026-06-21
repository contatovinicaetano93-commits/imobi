import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Param, Query, UseGuards, ForbiddenException, NotFoundException } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { LedgerService } from "./ledger.service";
import { PrismaService } from "../prisma/prisma.service";
import { isManagerRole } from "../../common/constants/manager-roles";

@ApiTags("Ledger")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard)
@Controller("ledger")
export class LedgerController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly prisma: PrismaService,
  ) {}

  private async assertCreditoAccess(creditoId: string, u: IUsuario) {
    if (isManagerRole(u.tipo)) return;
    const credito = await this.prisma.credito.findUnique({
      where: { creditoId },
      select: { usuarioId: true },
    });
    if (!credito) throw new NotFoundException("Crédito não encontrado.");
    if (credito.usuarioId !== u.id) throw new ForbiddenException("Acesso negado.");
  }

  @Get("credito/:creditoId/extrato")
  async extrato(
    @Param("creditoId") creditoId: string,
    @Query("take") take: string | undefined,
    @UsuarioAtual() u: IUsuario,
  ) {
    await this.assertCreditoAccess(creditoId, u);
    return this.ledger.extratoPorCredito(creditoId, take ? Number(take) : 50);
  }

  /** Cursor-based pagination — use `nextCursor` from previous response as `cursor` query param. */
  @Get("credito/:creditoId/extrato/cursor")
  async extratoCursor(
    @Param("creditoId") creditoId: string,
    @Query("cursor") cursor: string | undefined,
    @Query("take") take: string | undefined,
    @UsuarioAtual() u: IUsuario,
  ) {
    await this.assertCreditoAccess(creditoId, u);
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
