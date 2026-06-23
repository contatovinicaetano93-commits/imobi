import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { register } from 'prom-client';
import { SKIP_ALL_THROTTLES } from './guards/throttler.constants';

@SkipThrottle(SKIP_ALL_THROTTLES)
@Controller('metrics')
export class MetricsController {
  @Get()
  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}
