import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Post, Param, Query, Body, UseGuards, UseInterceptors, HttpCode } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { MarketplaceService } from "./marketplace.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { MarketplaceAvaliarSchema, MarketplaceCriarFornecedorSchema } from "@imbobi/schemas";
import type { MarketplaceAvaliarInput, MarketplaceCriarFornecedorInput } from "@imbobi/schemas";
import type { FornecedorTipo } from "@prisma/client";

@ApiTags("Marketplace")
@ApiBearerAuth("JWT")
@Controller("marketplace")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get("fornecedores")
  @Roles("TOMADOR", "CONSTRUTOR", "GESTOR", "ADMIN", "ENGENHEIRO")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  listar(
    @Query("tipo") tipo?: FornecedorTipo,
    @Query("uf") uf?: string,
    @Query("busca") busca?: string,
    @Query("limit") limit = "20",
    @Query("offset") offset = "0",
  ) {
    return this.marketplace.listarFornecedores({
      tipo,
      uf,
      busca,
      limit: Number(limit),
      offset: Number(offset),
    });
  }

  @Get("fornecedores/:id")
  @Roles("TOMADOR", "CONSTRUTOR", "GESTOR", "ADMIN", "ENGENHEIRO")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  obter(@Param("id") id: string) {
    return this.marketplace.obterFornecedor(id);
  }

  @Post("fornecedores/:id/avaliar")
  @Roles("TOMADOR", "CONSTRUTOR", "GESTOR", "ADMIN", "ENGENHEIRO")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  avaliar(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(MarketplaceAvaliarSchema)) body: MarketplaceAvaliarInput,
  ) {
    return this.marketplace.avaliar(id, u.id, body.nota, body.comentario);
  }

  @Post("fornecedores/:id/contato")
  @Roles("TOMADOR", "CONSTRUTOR", "GESTOR", "ADMIN", "ENGENHEIRO")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  contato(@Param("id") id: string, @UsuarioAtual() u: IUsuario) {
    return this.marketplace.solicitarContato(id, u.id);
  }

  @Post("fornecedores")
  @Roles("ADMIN")
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  criar(@Body(new ZodPipe(MarketplaceCriarFornecedorSchema)) body: MarketplaceCriarFornecedorInput) {
    return this.marketplace.criarFornecedor(body);
  }
}
