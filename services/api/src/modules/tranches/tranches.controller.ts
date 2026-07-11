import { Controller, Get, Post, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { TranchesService } from "./tranches.service";
import { CriarTrancheSchema, AnexarEvidenciaSchema, ValidarTrancheSchema } from "@imbobi/schemas";
import type { CriarTrancheInput, AnexarEvidenciaInput, ValidarTrancheInput } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as UsuarioAtualType } from "../../common/decorators/usuario-atual.decorator";

@Controller("tranches")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TranchesController {
  constructor(private readonly tranches: TranchesService) {}

  @Post()
  @Roles("ADMIN")
  criar(@Body(new ZodPipe(CriarTrancheSchema)) body: CriarTrancheInput) {
    return this.tranches.criar(body);
  }

  @Get("obra/:obraId")
  @Roles("ADMIN", "CLIENTE", "ENGENHEIRO", "FUNDO")
  listarPorObra(@Param("obraId") obraId: string, @UsuarioAtual() user: UsuarioAtualType) {
    return this.tranches.listarPorObra(obraId, user);
  }

  @Post(":id/evidencias")
  @Roles("ENGENHEIRO", "CLIENTE")
  anexarEvidencia(
    @Param("id") id: string,
    @UsuarioAtual() user: UsuarioAtualType,
    @Body(new ZodPipe(AnexarEvidenciaSchema)) body: AnexarEvidenciaInput,
  ) {
    return this.tranches.anexarEvidencia(id, user, body);
  }

  @Patch(":id/validar")
  @Roles("ENGENHEIRO")
  validar(
    @Param("id") id: string,
    @Body(new ZodPipe(ValidarTrancheSchema)) body: ValidarTrancheInput,
    @UsuarioAtual() user: UsuarioAtualType,
  ) {
    return this.tranches.validar(id, user.id, body);
  }

  @Patch(":id/liberar")
  @Roles("ADMIN")
  liberar(@Param("id") id: string, @UsuarioAtual() user: UsuarioAtualType) {
    return this.tranches.liberar(id, user.id);
  }
}
