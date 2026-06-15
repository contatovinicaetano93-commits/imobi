import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComercialService } from './comercial.service';
import { ComercialController } from './comercial.controller';
import { LeadPublicoController } from './lead-publico.controller';
import { ConversionScoringService } from './conversion-scoring.service';

@Module({
  controllers: [ComercialController, LeadPublicoController],
  providers: [ComercialService, ConversionScoringService, PrismaService],
  exports: [ComercialService, ConversionScoringService],
})
export class ComercialModule {}
