import { ApiTags } from "@nestjs/swagger";
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COMERCIAL', 'PARCEIRO', 'ADMIN')
@ApiTags("Parceiros")
@Controller('parceiros')
export class ParceirosController {
  constructor(private readonly parceirosService: ParceirosService) {}

  @Get('resumo')
  getResumo(@UsuarioAtual() u: IUsuario) {
    return this.parceirosService.getResumo(u.id);
  }

  @Get('operacoes')
  getOperacoes(@UsuarioAtual() u: IUsuario) {
    return this.parceirosService.getOperacoes(u.id);
  }

  @Get('mailing')
  getMailing(@UsuarioAtual() u: IUsuario) {
    return this.parceirosService.getMailing(u.id);
  }

  @Post('mailing')
  adicionarMailing(
    @UsuarioAtual() u: IUsuario,
    @Body() body: AdicionarMailingDto,
  ) {
    return this.parceirosService.adicionarMailing(u.id, body);
  }
}
