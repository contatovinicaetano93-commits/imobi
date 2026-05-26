import { Controller, Get, Patch, UseGuards, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { UsuariosService } from "./usuarios.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@ApiTags("usuarios")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("usuarios")
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get("meu-perfil")
  @ApiOperation({ summary: "Buscar perfil do usuário autenticado" })
  @ApiResponse({
    status: 200,
    description: "Perfil do usuário",
    schema: {
      type: "object",
      properties: {
        usuarioId: { type: "string" },
        nome: { type: "string" },
        email: { type: "string" },
        cpf: { type: "string" },
        telefone: { type: "string" },
        tipo: { type: "string" },
        kycStatus: { type: "string" },
      },
    },
  })
  async meuPerfil(@UsuarioAtual() u: IUsuario) {
    return this.usuarios.buscarPerfil(u.id);
  }

  @Patch("meu-perfil")
  @ApiOperation({ summary: "Atualizar perfil do usuário" })
  @ApiResponse({ status: 200, description: "Perfil atualizado com sucesso" })
  async atualizarPerfil(
    @UsuarioAtual() u: IUsuario,
    @Body() data: { nome?: string; telefone?: string }
  ) {
    return this.usuarios.atualizarPerfil(u.id, data);
  }
}
