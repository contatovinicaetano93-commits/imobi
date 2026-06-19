import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ParceirosService } from './parceiros.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioAtual,
  type UsuarioAtual as IUsuario,
} from '../../common/decorators/usuario-atual.decorator';

interface AdicionarMailingDto {
  nome: string;
  email: string;
  telefone?: string;
}

@ApiTags("parceiros")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COMERCIAL', 'PARCEIRO', 'ADMIN')
@Controller('parceiros')
export class ParceirosController {
  constructor(private readonly parceirosService: ParceirosService) {}

  @ApiOperation({ summary: "Resumo do parceiro (comissões, leads, conversão)" })
  @Get('resumo')
  getResumo(@UsuarioAtual() u: IUsuario) {
    return this.parceirosService.getResumo(u.id);
  }

  @ApiOperation({ summary: "Operações do parceiro" })
  @Get('operacoes')
  getOperacoes(@UsuarioAtual() u: IUsuario) {
    return this.parceirosService.getOperacoes(u.id);
  }

  @ApiOperation({ summary: "Mailing list do parceiro" })
  @Get('mailing')
  getMailing(@UsuarioAtual() u: IUsuario) {
    return this.parceirosService.getMailing(u.id);
  }

  @ApiOperation({ summary: "Adicionar contato ao mailing" })
  @Post('mailing')
  adicionarMailing(
    @UsuarioAtual() u: IUsuario,
    @Body() body: AdicionarMailingDto,
  ) {
    return this.parceirosService.adicionarMailing(u.id, body);
  }
}
