import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { WebhookService } from "./webhook.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/webhooks")
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  async create(
    @Body() body: { url: string; eventos: string[] }
  ) {
    return this.webhookService.create({
      url: body.url,
      eventos: body.eventos as any,
    });
  }

  @Get()
  async list(@Query("ativo") ativo?: string) {
    const ativoFilter = ativo ? ativo === "true" : undefined;
    return this.webhookService.list(ativoFilter);
  }

  @Get(":id")
  async getById(@Param("id") webhookId: string) {
    return this.webhookService.getById(webhookId);
  }

  @Patch(":id")
  async update(
    @Param("id") webhookId: string,
    @Body() body: { url?: string; eventos?: string[] }
  ) {
    return this.webhookService.update(webhookId, {
      url: body.url,
      eventos: body.eventos as any,
    });
  }

  @Patch(":id/toggle")
  async toggleActive(
    @Param("id") webhookId: string,
    @Body() body: { ativo: boolean }
  ) {
    return this.webhookService.toggleActive(webhookId, body.ativo);
  }

  @Delete(":id")
  async delete(@Param("id") webhookId: string) {
    await this.webhookService.delete(webhookId);
    return { message: "Webhook deletado com sucesso" };
  }

  @Get(":id/logs")
  async getLogs(
    @Param("id") webhookId: string,
    @Query("evento") evento?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.webhookService.getLogs(webhookId, {
      evento,
      status: status as any,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Post(":id/test")
  async test(@Param("id") webhookId: string) {
    return this.webhookService.test(webhookId);
  }
}
