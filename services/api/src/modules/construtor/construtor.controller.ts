import { Controller, Get, UseGuards, UseInterceptors } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { ConstrutorService } from "./construtor.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@Controller("construtor")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("CONSTRUTOR", "TOMADOR", "ADMIN")
export class ConstrutorController {
  constructor(private readonly construtor: ConstrutorService) {}

  @Get("resumo")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  resumo(@UsuarioAtual() u: IUsuario) {
    return this.construtor.resumo(u.id);
  }

  @Get("cronograma-desembolsos")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120)
  cronograma(@UsuarioAtual() u: IUsuario) {
    return this.construtor.cronogramaDesembolsos(u.id);
  }

  @Get("acompanhamento-tecnico")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  acompanhamento(@UsuarioAtual() u: IUsuario) {
    return this.construtor.acompanhamentoTecnico(u.id);
  }
}
