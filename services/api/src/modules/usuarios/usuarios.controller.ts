import { Controller, Get, Patch, UseGuards, Body } from "@nestjs/common";
import { UsuariosService } from "./usuarios.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("usuarios")
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get("meu-perfil")
  async meuPerfil(@UsuarioAtual() u: IUsuario) {
    return this.usuarios.buscarPerfil(u.id);
  }

  @Patch("meu-perfil")
  async atualizarPerfil(
    @UsuarioAtual() u: IUsuario,
    @Body() data: { nome?: string; telefone?: string }
  ) {
    return this.usuarios.atualizarPerfil(u.id, data);
  }
}
