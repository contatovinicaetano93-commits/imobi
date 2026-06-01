import {
  Injectable,
  LoggerService as ILoggerService,
  Logger,
} from "@nestjs/common";

@Injectable()
export class LoggerService implements ILoggerService {
  private readonly logger = new Logger("ImobiAPI");

  log(message: string, context?: string, meta?: any) {
    this.logger.log(
      `${message}${meta ? " " + JSON.stringify(meta) : ""}`,
      context,
    );
  }

  error(message: string, trace?: string, context?: string, meta?: any) {
    this.logger.error(
      `${message}${meta ? " " + JSON.stringify(meta) : ""}`,
      trace,
      context,
    );
  }

  warn(message: string, context?: string, meta?: any) {
    this.logger.warn(
      `${message}${meta ? " " + JSON.stringify(meta) : ""}`,
      context,
    );
  }

  debug(message: string, context?: string, meta?: any) {
    this.logger.debug(
      `${message}${meta ? " " + JSON.stringify(meta) : ""}`,
      context,
    );
  }

  verbose(message: string, context?: string, meta?: any) {
    this.logger.verbose(
      `${message}${meta ? " " + JSON.stringify(meta) : ""}`,
      context,
    );
  }
}
