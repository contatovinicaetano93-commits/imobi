import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggerService } from './logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip } = req;
    const startTime = Date.now();

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - startTime;
        const res = context.switchToHttp().getResponse();

        this.logger.log('HTTP Request', 'HTTP', {
          method,
          url,
          statusCode: res.statusCode,
          ip,
          duration: `${duration}ms`,
          userId: req.user?.id,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error('HTTP Request Error', error.stack, 'HTTP', {
          method,
          url,
          statusCode: error.status || 500,
          ip,
          duration: `${duration}ms`,
          userId: req.user?.id,
          error: error.message,
        });
        throw error;
      }),
    );
  }
}
