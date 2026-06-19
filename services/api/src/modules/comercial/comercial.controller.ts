import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComercialService } from './comercial.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioAtual, type UsuarioAtual as IUsuario } from '../../common/decorators/usuario-atual.decorator';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { CreateLeadSchema, AddLeadActivitySchema } from '@imbobi/schemas';
import type { CreateLeadInput, AddLeadActivityInput } from '@imbobi/schemas';

@ApiTags("comercial")
@ApiBearerAuth()
@Controller('comercial')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COMERCIAL', 'PARCEIRO', 'ADMIN')
export class ComercialController {
  constructor(private readonly comercialService: ComercialService) {}

  @ApiOperation({ summary: "Listar estágios do pipeline comercial" })
  @Get('pipeline/stages')
  async getPipelineStages() {
    return this.comercialService.listarStages();
  }

  @ApiOperation({ summary: "Estatísticas do dashboard comercial" })
  @Get('dashboard/stats')
  async getDashboardStats(@UsuarioAtual() u: IUsuario) {
    return this.comercialService.obterDashboardStats(u.tipo === 'ADMIN' ? undefined : u.id);
  }

  @Get('leads')
  async listLeads(
    @UsuarioAtual() u: IUsuario,
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

    const scopeUserId = u.tipo === 'ADMIN' ? undefined : u.id;
    return this.comercialService.listarLeads(
      parseInt(limit),
      parseInt(offset),
      filters,
      scopeUserId
    );
  }

  @Post('leads')
  async createLead(@UsuarioAtual() u: IUsuario, @Body(new ZodPipe(CreateLeadSchema)) data: CreateLeadInput) {
    return this.comercialService.criarLead(u.id, data);
  }

  @Get('leads/:leadId')
  async getLeadDetail(@UsuarioAtual() u: IUsuario, @Param('leadId') leadId: string) {
    const scopeUserId = u.tipo === 'ADMIN' ? undefined : u.id;
    return this.comercialService.obterLeadDetalhe(leadId, scopeUserId);
  }

  @Get('leads/:leadId/score')
  async getLeadScore(@UsuarioAtual() u: IUsuario, @Param('leadId') leadId: string) {
    const scopeUserId = u.tipo === 'ADMIN' ? undefined : u.id;
    return this.comercialService.calcularScoreConversao(leadId, scopeUserId);
  }

  @Post('leads/:leadId/atividades')
  async addActivity(
    @Param('leadId') leadId: string,
    @Body(new ZodPipe(AddLeadActivitySchema)) data: AddLeadActivityInput,
    @UsuarioAtual() u: IUsuario
  ) {
    const scopeUserId = u.tipo === 'ADMIN' ? undefined : u.id;
    return this.comercialService.adicionarAtividade(leadId, u.id, data, scopeUserId);
  }
}
