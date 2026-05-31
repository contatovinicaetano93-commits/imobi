import { Controller, Get, Patch, UseGuards, Body, UseInterceptors } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
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
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600)
  @ApiOperation({ summary: "Meu perfil", description: "Retorna dados do perfil do usuário autenticado (10min cache)" })
  @ApiResponse({ status: 200, description: "Dados do perfil carregados" })
  async meuPerfil(@UsuarioAtual() u: IUsuario) {
    return this.usuarios.buscarPerfil(u.id);
  }

  @Patch("meu-perfil")
  @ApiOperation({ summary: "Atualizar perfil", description: "Atualiza nome e/ou telefone do usuário" })
  @ApiResponse({ status: 200, description: "Perfil atualizado com sucesso" })
  async atualizarPerfil(
    @UsuarioAtual() u: IUsuario,
    @Body() data: { nome?: string; telefone?: string }
  ) {
    return this.usuarios.atualizarPerfil(u.id, data);
  }
}
