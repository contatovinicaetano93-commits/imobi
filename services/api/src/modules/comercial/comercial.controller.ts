import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ComercialService } from './comercial.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioAtual, type UsuarioAtual as IUsuario } from '../../common/decorators/usuario-atual.decorator';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { ApiCreateLeadSchema, ApiAddLeadActivitySchema } from '@imbobi/schemas';
import type { ApiCreateLeadInput, ApiAddLeadActivityInput } from '@imbobi/schemas';

@ApiTags("Comercial")
@ApiBearerAuth("JWT")
@Controller('comercial')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COMERCIAL', 'ADMIN')
export class ComercialController {
  constructor(private readonly comercialService: ComercialService) {}

  @Get('pipeline/stages')
  async getPipelineStages() {
    return this.comercialService.listarStages();
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.comercialService.obterDashboardStats();
  }

  @Get('leads')
  async listLeads(
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
    @Query('stageId') stageId?: string,
    @Query('fonte') fonte?: string,
    @Query('segmentoCliente') segmentoCliente?: string,
    @Query('scoreMin') scoreMin?: string,
    @Query('scoreMax') scoreMax?: string,
    @Query('searchTerm') searchTerm?: string
  ) {
    const filters = {
      stageId,
      fonte,
      segmentoCliente,
      scoreMin: scoreMin ? parseInt(scoreMin) : undefined,
      scoreMax: scoreMax ? parseInt(scoreMax) : undefined,
      searchTerm,
    };

    return this.comercialService.listarLeads(
      parseInt(limit),
      parseInt(offset),
      filters
    );
  }

  @Post('leads')
  async createLead(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(ApiCreateLeadSchema)) data: ApiCreateLeadInput,
  ) {
    return this.comercialService.criarLead(u.id, data);
  }

  @Get('leads/:leadId')
  async getLeadDetail(@Param('leadId') leadId: string) {
    return this.comercialService.obterLeadDetalhe(leadId);
  }

  @Get('leads/:leadId/score')
  async getLeadScore(@Param('leadId') leadId: string) {
    return this.comercialService.calcularScoreConversao(leadId);
  }

  @Post('leads/:leadId/atividades')
  async addActivity(
    @Param('leadId') leadId: string,
    @Body(new ZodPipe(ApiAddLeadActivitySchema)) data: ApiAddLeadActivityInput,
    @UsuarioAtual() u: IUsuario,
  ) {
    return this.comercialService.adicionarAtividade(leadId, u.id, data);
  }
}
