import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ComercialService } from "./comercial.service";

@Controller("comercial")
export class ComercialController {
  constructor(private comercialService: ComercialService) {}

  // ─── Lead Management ──────────────────────────────────────
  @Post("leads")
  async criarLead(@Body() data: any) {
    return this.comercialService.criarLead(data);
  }

  @Get("leads")
  async listarLeads(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("filters") filters?: string
  ) {
    const parsedLimit = limit ? parseInt(limit) : 20;
    const parsedOffset = offset ? parseInt(offset) : 0;
    const parsedFilters = filters ? JSON.parse(filters) : undefined;

    return this.comercialService.listarLeads(
      parsedLimit,
      parsedOffset,
      parsedFilters
    );
  }

  @Get("leads/:id")
  async obterLeadDetalhe(@Param("id") leadId: string) {
    return this.comercialService.obterLeadDetalhe(leadId);
  }

  // ─── Conversion Scoring ───────────────────────────────────
  @Post("leads/:id/calcular-score")
  async calcularScore(@Param("id") leadId: string) {
    return this.comercialService.calcularScoreConversao(leadId);
  }

  // ─── Lead Activities ──────────────────────────────────────
  @Post("leads/:id/atividades")
  async adicionarAtividade(
    @Param("id") leadId: string,
    @Body() data: any
  ) {
    return this.comercialService.adicionarAtividade(leadId, "user-id", data);
  }
}
