import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ComercialService } from './comercial.service';
import { LeadCapturaPublicaSchema } from '@imbobi/schemas';

@Controller('leads')
export class LeadPublicoController {
  constructor(private readonly comercial: ComercialService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('captura')
  async captura(@Body() body: unknown) {
    const parsed = LeadCapturaPublicaSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
    }
    return this.comercial.capturaPublica(parsed.data as Parameters<typeof this.comercial.capturaPublica>[0]);
  }
}
