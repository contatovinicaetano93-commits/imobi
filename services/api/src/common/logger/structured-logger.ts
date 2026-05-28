import { LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface LogContext {
  userId?: string;
  requestId?: string;
  action?: string;
  duration?: number;
  error?: string;
  [key: string]: any;
}

export class StructuredLogger implements LoggerService {
  private context: string;
  private readonly isDev: boolean;
  private readonly logsDir: string;

  constructor(context: string = 'App') {
    this.context = context;
    this.isDev = (process.env.NODE_ENV || 'development') !== 'production';

    // Create logs directory in production
    if (!this.isDev) {
      this.logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }
    }
  }

  log(message: string, ctx?: LogContext | string) {
    this.writeLog('INFO', message, ctx);
  }

  error(message: string, trace?: string, ctx?: LogContext | string) {
    const context = typeof ctx === 'string' ? { trace } : { ...ctx, trace };
    this.writeLog('ERROR', message, context);
  }

  warn(message: string, ctx?: LogContext | string) {
    this.writeLog('WARN', message, ctx);
  }

  debug(message: string, ctx?: LogContext | string) {
    if (this.isDev) {
      this.writeLog('DEBUG', message, ctx);
    }
  }

  verbose(message: string, ctx?: LogContext | string) {
    if (this.isDev) {
      this.writeLog('VERBOSE', message, ctx);
    }
  }

  private writeLog(level: string, message: string, ctx?: LogContext | string) {
    const timestamp = new Date().toISOString();
    const context = typeof ctx === 'string' ? ctx : this.context;

    const logEntry = {
      timestamp,
      level,
      context,
      message,
      ...(typeof ctx === 'object' && ctx),
    };

    // To console
    if (this.isDev) {
      const color = this.getColorCode(level);
      console.log(
        `${color}[${timestamp}] [${level}] [${context}] ${message}${this.formatContext(ctx)}`,
      );
    } else {
      console.log(JSON.stringify(logEntry));
    }

    // To file in production
    if (!this.isDev && level !== 'DEBUG' && level !== 'VERBOSE') {
      this.writeToFile(logEntry);
    }
  }

  private formatContext(ctx?: LogContext | string): string {
    if (!ctx || typeof ctx === 'string') return '';
    const entries = Object.entries(ctx)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => ` ${k}=${JSON.stringify(v)}`)
      .join('');
    return entries ? ` {${entries} }` : '';
  }

  private getColorCode(level: string): string {
    const colors: Record<string, string> = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m', // Yellow
      INFO: '\x1b[32m', // Green
      DEBUG: '\x1b[36m', // Cyan
      VERBOSE: '\x1b[90m', // Gray
    };
    return colors[level] || '\x1b[0m';
  }

  private writeToFile(logEntry: object) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logsDir, `${today}.log`);
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n', 'utf8');
    } catch (err) {
      console.error('Failed to write log to file:', err);
    }
  }
}

export const createStructuredLogger = (context: string) => {
  return new StructuredLogger(context);
};
