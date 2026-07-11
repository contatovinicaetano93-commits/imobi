import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from "@nestjs/common";
import { UsuariosService } from "./usuarios.service";
import { AtualizarUsuarioAdminSchema, CriarUsuarioAdminSchema, RoleEnum } from "@imbobi/schemas";
import type { AtualizarUsuarioAdminInput, CriarUsuarioAdminInput, Role } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("usuarios")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Post()
  criar(@Body(new ZodPipe(CriarUsuarioAdminSchema)) body: CriarUsuarioAdminInput) {
    return this.usuarios.criar(body);
  }

  @Get()
  listar(@Query("role") role?: string) {
    const parsed = role ? RoleEnum.parse(role) : undefined;
    return this.usuarios.listar(parsed as Role | undefined);
  }

  @Get(":id")
  obter(@Param("id") id: string) {
    return this.usuarios.obter(id);
  }

  @Patch(":id")
  atualizar(
    @Param("id") id: string,
    @Body(new ZodPipe(AtualizarUsuarioAdminSchema)) body: AtualizarUsuarioAdminInput,
  ) {
    return this.usuarios.atualizar(id, body);
  }

  @Patch(":id/ativo")
  alternarAtivo(@Param("id") id: string, @Body("ativo") ativo: boolean) {
    return this.usuarios.alternarAtivo(id, ativo);
  }
}
