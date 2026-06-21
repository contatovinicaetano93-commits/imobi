import { Controller, Post, Get, Delete, Body, Param, UseGuards, HttpCode, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { WebhooksService } from "./webhooks.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";

@ApiTags("Webhooks")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard)
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  registrar(
    @UsuarioAtual("usuarioId") usuarioId: string,
    @Body("url") url: string,
    @Body("eventos") eventos: string[],
  ) {
    return this.webhooks.registrar(usuarioId, url, eventos);
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  listar(@UsuarioAtual("usuarioId") usuarioId: string) {
    return this.webhooks.listar(usuarioId);
  }

  @Delete(":webhookId")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  deletar(@Param("webhookId") webhookId: string, @UsuarioAtual("usuarioId") usuarioId: string) {
    return this.webhooks.deletar(webhookId, usuarioId);
  }

  @Get(":webhookId/deliveries")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  listarDeliveries(
    @Param("webhookId") webhookId: string,
    @UsuarioAtual("usuarioId") usuarioId: string,
    @Query("take") take?: string,
  ) {
    return this.webhooks.listarDeliveries(webhookId, usuarioId, take ? Number(take) : 50);
  }
}
