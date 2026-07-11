import { Controller, Get, UseGuards, ForbiddenException } from "@nestjs/common";
import { EtapasService } from "./etapas.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as UsuarioAtualType } from "../../common/decorators/usuario-atual.decorator";

/** Um único endpoint guiado — cada papel recebe o passo que importa agora. */
@Controller("jornada")
@UseGuards(JwtAuthGuard)
export class EtapasController {
  constructor(private readonly etapas: EtapasService) {}

  @Get()
  obter(@UsuarioAtual() user: UsuarioAtualType) {
    switch (user.role) {
      case "CLIENTE":
        return this.etapas.paraCliente(user.id);
      case "ENGENHEIRO":
        return this.etapas.paraEngenheiro(user.id);
      case "ADMIN":
        return this.etapas.paraAdmin();
      default:
        throw new ForbiddenException("Papel sem jornada guiada.");
    }
  }
}
