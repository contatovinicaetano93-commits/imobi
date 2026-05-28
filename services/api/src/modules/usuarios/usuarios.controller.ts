import { Controller, Get, Patch, UseGuards, Body } from "@nestjs/common";
import { UsuariosService } from "./usuarios.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { AtualizarPerfilSchema } from "@imbobi/schemas";
import { Throttle } from "../../common/decorators/throttle.decorator";
import { UserThrottlerGuard } from "../../common/guards/user-throttler.guard";

@UseGuards(JwtAuthGuard)
@Controller("usuarios")
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get("meu-perfil")
  async meuPerfil(@UsuarioAtual() u: IUsuario) {
    return this.usuarios.buscarPerfil(u.id);
  }

  @Patch("meu-perfil")
  @UseGuards(UserThrottlerGuard)
  @Throttle(10, 3600000) // 10 requests per hour per user
  async atualizarPerfil(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(AtualizarPerfilSchema)) data: unknown
  ) {
    return this.usuarios.atualizarPerfil(u.id, data as never);
  }
}
