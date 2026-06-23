import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { PrometheusService } from '../observability/prometheus.service';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private prometheus: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers } = request;
    const startTime = Date.now();
    const requestId = headers['x-request-id'] || `req-${Date.now()}`;

    return next.handle().pipe(
      tap((data) => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - startTime;

        this.logger.debug(
          `${method} ${url} - ${response.statusCode} (${duration}ms)`,
        );

        this.prometheus.recordHttpRequest(
          method,
          url.split('?')[0],
          response.statusCode,
          duration,
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error?.status || error?.statusCode || 500;

        this.logger.error(
          `${method} ${url} - ${statusCode} (${duration}ms) - ${error?.message || 'Unknown error'}`,
        );

        this.prometheus.recordHttpRequest(
          method,
          url.split('?')[0],
          statusCode,
          duration,
        );

        return throwError(() => error);
      }),
    );
  }
}
