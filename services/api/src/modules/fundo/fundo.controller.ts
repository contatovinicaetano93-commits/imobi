import { Controller, Get, UseGuards } from '@nestjs/common';
import { FundoService } from './fundo.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('fundo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GESTOR_FUNDO', 'GESTOR', 'ADMIN')
export class FundoController {
  constructor(private readonly fundoService: FundoService) {}

  @Get('overview')
  getOverview() {
    return this.fundoService.getOverview();
  }

  @Get('riscos')
  getRiscos() {
    return this.fundoService.getRiscos();
  }
}
