import { Controller, Get, Post, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { ObrasService } from "./obras.service";
import { CriarObraSchema, HomologarObraSchema } from "@imbobi/schemas";
import type { CriarObraInput, HomologarObraInput } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as UsuarioAtualType } from "../../common/decorators/usuario-atual.decorator";

@Controller("obras")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ObrasController {
  constructor(private readonly obras: ObrasService) {}

  @Post()
  @Roles("CLIENTE")
  criar(@UsuarioAtual() user: UsuarioAtualType, @Body(new ZodPipe(CriarObraSchema)) body: CriarObraInput) {
    return this.obras.criar(user.id, body);
  }

  @Get("minhas")
  @Roles("CLIENTE")
  minhas(@UsuarioAtual() user: UsuarioAtualType) {
    return this.obras.listarPorCliente(user.id);
  }

  @Get("atribuidas")
  @Roles("ENGENHEIRO")
  atribuidas(@UsuarioAtual() user: UsuarioAtualType) {
    return this.obras.listarPorEngenheiro(user.id);
  }

  @Get()
  @Roles("ADMIN", "FUNDO")
  listarTodas() {
    return this.obras.listarTodas();
  }

  @Get(":id")
  @Roles("ADMIN", "FUNDO", "CLIENTE", "ENGENHEIRO")
  obter(@Param("id") id: string, @UsuarioAtual() user: UsuarioAtualType) {
    return this.obras.obter(id, user);
  }

  @Patch(":id/avancar")
  @Roles("ADMIN")
  avancar(@Param("id") id: string, @UsuarioAtual() user: UsuarioAtualType) {
    return this.obras.avancar(id, user.id);
  }

  @Patch(":id/homologar")
  @Roles("ADMIN")
  homologar(
    @Param("id") id: string,
    @Body(new ZodPipe(HomologarObraSchema)) body: HomologarObraInput,
    @UsuarioAtual() user: UsuarioAtualType,
  ) {
    return this.obras.homologar(id, body.engenheiroId, user.id);
  }
}
