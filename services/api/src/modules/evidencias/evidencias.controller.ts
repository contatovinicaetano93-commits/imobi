import {
  Controller, Post, Get, Patch, Param, Body, UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { EvidenciasService } from "./evidencias.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("evidencias")
export class EvidenciasController {
  constructor(private readonly evidencias: EvidenciasService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  upload(
    @UsuarioAtual() u: IUsuario,
    @Body() body: any
  ) {
    return this.evidencias.upload(u.id, body, Buffer.alloc(0), "image/jpeg");
  }

  @Get("etapa/:etapaId")
  listar(@UsuarioAtual() u: IUsuario, @Param("etapaId") etapaId: string) {
    return this.evidencias.listarPorEtapa(u, etapaId);
  }

  @Patch(":id/validar")
  validar(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("aprovado") aprovado: boolean,
    @Body("observacao") obs?: string
  ) {
    return this.evidencias.validar(u, id, aprovado, obs);
  }
}
