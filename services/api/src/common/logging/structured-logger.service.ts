import { Injectable } from '@nestjs/common';
import * as os from 'os';

export interface LogContext {
  [key: string]: any;
}

@Injectable()
export class StructuredLoggerService {
  private readonly service = 'imobi-api';
  private readonly version = '1.0.0';
  private readonly hostname = os.hostname();

  log(message: string, context?: LogContext): void {
    const logEntry = this.formatLog('INFO', message, context);
    console.log(JSON.stringify(logEntry));
  }

  error(message: string, context?: LogContext | Error): void {
    const errorContext = context instanceof Error
      ? { error: context.message, stack: context.stack }
      : context;
    const logEntry = this.formatLog('ERROR', message, errorContext);
    console.error(JSON.stringify(logEntry));
  }

  warn(message: string, context?: LogContext): void {
    const logEntry = this.formatLog('WARN', message, context);
    console.warn(JSON.stringify(logEntry));
  }

  debug(message: string, context?: LogContext): void {
    const logEntry = this.formatLog('DEBUG', message, context);
    console.log(JSON.stringify(logEntry));
  }

  logPerformance(
    operationName: string,
    durationMs: number,
    context?: LogContext,
  ): void {
    const logEntry = {
      ...this.baseLog('PERF'),
      operation: operationName,
      durationMs,
      message: `Operation ${operationName} completed in ${durationMs}ms`,
      context,
    };
    console.log(JSON.stringify(logEntry));
  }

  private formatLog(
    level: string,
    message: string,
    context?: LogContext,
  ): object {
    return {
      ...this.baseLog(level),
      message,
      context,
    };
  }

  private baseLog(level: string): object {
    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      version: this.version,
      hostname: this.hostname,
      pid: process.pid,
    };
  }
}
