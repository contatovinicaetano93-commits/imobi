import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ComercialService } from './comercial.service';
import { z } from 'zod';

const CapturaPublicaSchema = z.object({
  clienteNome:     z.string().min(2, 'Nome obrigatório'),
  clienteEmail:    z.string().email('E-mail inválido'),
  clienteTelefone: z.string().min(10, 'Telefone inválido'),
  empresa:         z.string().optional(),
  cargo:           z.string().optional(),
  modalidade:      z.string().optional(),
  volume:          z.string().optional(),
  observacoes:     z.string().max(1000).optional(),
});

@Controller('leads')
export class LeadPublicoController {
  constructor(private readonly comercial: ComercialService) {}

  @Post('captura')
  async captura(@Body() body: unknown) {
    const parsed = CapturaPublicaSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
    }
    return this.comercial.capturaPublica(parsed.data as Parameters<typeof this.comercial.capturaPublica>[0]);
  }
}
