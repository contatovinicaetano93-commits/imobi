import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggerService } from '../logger.service';
import { DataRedactionUtil } from '../utils/data-redaction.util';
import { ErrorCategorizerUtil } from '../utils/error-categorizer.util';

@Injectable()
export class StructuredLoggingInterceptor implements NestInterceptor {
  constructor(@Inject(LoggerService) private logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;

    const logContext = {
      requestId: request.id,
      traceId: request.traceId,
      method,
      url: DataRedactionUtil.redactUrl(url),
      ip,
      userId: request.user?.id,
      timestamp: new Date().toISOString(),
    };

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - request.startTime;
        const res = context.switchToHttp().getResponse();

        this.logger.log(
          `${method} ${DataRedactionUtil.redactUrl(url)} - ${res.statusCode}`,
          'HTTP',
          {
            ...logContext,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            responseSize: JSON.stringify(response).length,
          }
        );
      }),
      catchError((error) => {
        const duration = Date.now() - request.startTime;
        const status = error.status || 500;
        const errorMetadata = ErrorCategorizerUtil.categorize(status, error);

        const errorContext = {
          ...logContext,
          statusCode: status,
          category: errorMetadata.category,
          severity: errorMetadata.severity,
          retryable: errorMetadata.retryable,
          duration: `${duration}ms`,
          error: error.message,
        };

        const logLevel = this.selectLogLevel(errorMetadata.severity);
        this.logger[logLevel](
          `Error in ${method} ${DataRedactionUtil.redactUrl(url)}`,
          'HTTP',
          DataRedactionUtil.redact(errorContext)
        );

        throw error;
      })
    );
  }

  private selectLogLevel(severity: string): 'error' | 'warn' | 'debug' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
      default:
        return 'debug';
    }
  }
}
