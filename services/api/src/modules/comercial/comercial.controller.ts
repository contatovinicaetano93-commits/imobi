import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ComercialService } from './comercial.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/comercial')
@UseGuards(JwtAuthGuard)
export class ComercialController {
  constructor(private readonly comercialService: ComercialService) {}

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
  async createLead(@Body() data: any) {
    return this.comercialService.criarLead(data);
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
    @Body() data: any,
    @Req() req: any
  ) {
    const usuarioId = req.user.usuarioId;
    return this.comercialService.adicionarAtividade(leadId, usuarioId, data);
  }
}
