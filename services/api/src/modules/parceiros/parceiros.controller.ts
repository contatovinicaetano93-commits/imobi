import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
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
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { AdicionarMailingSchema } from '@imbobi/schemas';
import type { AdicionarMailingInput } from '@imbobi/schemas';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COMERCIAL', 'PARCEIRO', 'ADMIN')
@ApiTags("Parceiros")
@ApiBearerAuth("JWT")
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
    @Body(new ZodPipe(AdicionarMailingSchema)) body: AdicionarMailingInput,
  ) {
    return this.parceirosService.adicionarMailing(u.id, body);
  }

  @Delete('mailing/:id')
  @HttpCode(204)
  removerMailing(@Param('id') id: string, @UsuarioAtual() u: IUsuario) {
    return this.parceirosService.removerMailing(id, u.id);
  }
}
