import { Controller, Get, UseGuards } from "@nestjs/common";
import { JornadaService } from "./jornada.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("jornada")
export class JornadaController {
  constructor(private readonly jornada: JornadaService) {}

  @Get()
  obter(@UsuarioAtual() u: IUsuario) {
    return this.jornada.obter(u.id, u.tipo);
  }
}
