import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode } from "@nestjs/common";
import { DueDiligenceService } from "./due-diligence.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { CriarDueDiligenceSchema, AtualizarDueDiligenceStatusSchema } from "@imbobi/schemas";
import type { CriarDueDiligenceInput, AtualizarDueDiligenceStatusInput } from "@imbobi/schemas";

@UseGuards(JwtAuthGuard)
@ApiTags("Due Diligence")
@ApiBearerAuth("JWT")
@Controller("due-diligence")
export class DueDiligenceController {
  constructor(private readonly service: DueDiligenceService) {}

  @Post()
  @HttpCode(201)
  criar(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(CriarDueDiligenceSchema)) body: CriarDueDiligenceInput,
  ) {
    return this.service.criar(u.id, body);
  }

  @Get()
  listar(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit = "20",
    @Query("offset") offset = "0",
  ) {
    return this.service.listar(u.id, Number(limit), Number(offset));
  }

  @Get(":id")
  buscar(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    const isAdmin = u.tipo === "ADMIN";
    return this.service.buscar(id, u.id, isAdmin);
  }

  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @Patch(":id/status")
  atualizarStatus(
    @Param("id") id: string,
    @Body(new ZodPipe(AtualizarDueDiligenceStatusSchema)) body: AtualizarDueDiligenceStatusInput,
  ) {
    return this.service.atualizarStatus(id, body);
  }
}
