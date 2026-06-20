import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { FundosService } from "./fundos.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("Fundos")
@Controller("fundos")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("GESTOR_FUNDO", "ADMIN")
export class FundosController {
  constructor(private readonly fundos: FundosService) {}

  @Get("portfolio")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  portfolio() {
    return this.fundos.portfolio();
  }

  @Get("obras")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  listarObras(
    @Query("limit") limit = "20",
    @Query("offset") offset = "0",
    @Query("status") status?: string,
    @Query("busca") busca?: string,
  ) {
    return this.fundos.listarObras(Number(limit), Number(offset), { status, busca });
  }

  @Get("por-regiao")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600)
  porRegiao() {
    return this.fundos.porRegiao();
  }

  @Get("exposicao-credito")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  exposicaoCredito() {
    return this.fundos.exposicaoCredito();
  }
}
