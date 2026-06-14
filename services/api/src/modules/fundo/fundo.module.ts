import { Module } from '@nestjs/common';
import { FundoService } from './fundo.service';
import { FundoController } from './fundo.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [FundoController],
  providers: [FundoService, PrismaService],
})
export class FundoModule {}
