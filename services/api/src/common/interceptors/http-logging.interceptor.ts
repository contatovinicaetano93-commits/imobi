import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StructuredLoggerService } from '../logging/structured-logger.service';
import { PrometheusService } from '../observability/prometheus.service';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(
    private logger: StructuredLoggerService,
    private prometheus: PrometheusService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers } = request;
    const startTime = Date.now();
    const requestId = headers['x-request-id'] || `req-${Date.now()}`;

    return next.handle().pipe(
      tap(
        (data) => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;

          this.logger.log(`${method} ${url}`, {
            requestId,
            method,
            url,
            statusCode: response.statusCode,
            duration,
          });

          this.prometheus.recordHttpRequest(
            method,
            url.split('?')[0],
            response.statusCode,
            duration,
          );
        },
        (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(`${method} ${url} failed`, {
            requestId,
            method,
            url,
            duration,
            error: error instanceof Error ? error.message : String(error),
          });

          this.prometheus.recordHttpRequest(
            method,
            url.split('?')[0],
            error.status || 500,
            duration,
          );
        },
      ),
    );
  }
}
