import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { LoggerService } from "../logger.service";
import { DataRedactionUtil } from "../utils/data-redaction.util";
import { ErrorCategorizerUtil } from "../utils/error-categorizer.util";

@Catch()
export class StructuredExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LoggerService) private logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let errorDetail: any;
    let validation: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const obj = exceptionResponse as Record<string, any>;
        message = obj.message || exception.message;
        validation = obj.error;
        errorDetail = obj;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetail = exception;
    } else {
      message = String(exception);
    }

    const errorMetadata = ErrorCategorizerUtil.categorize(status, exception);

    const errorResponse = {
      statusCode: status,
      message,
      error: validation,
      requestId: request.id,
      traceId: request.traceId,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === "development" && {
        stack: errorDetail?.stack,
      }),
    };

    const logContext = {
      requestId: request.id,
      traceId: request.traceId,
      method: request.method,
      url: DataRedactionUtil.redactUrl(request.url),
      statusCode: status,
      ip: request.ip,
      userId: request.user?.id,
      category: errorMetadata.category,
      severity: errorMetadata.severity,
      retryable: errorMetadata.retryable,
      duration: `${Date.now() - request.startTime}ms`,
      error: message,
    };

    const logLevel = this.selectLogLevel(errorMetadata.severity);
    this.logger[logLevel](
      `${errorMetadata.category}: ${message}`,
      "Exception",
      DataRedactionUtil.redact(logContext),
    );

    response.status(status).send(errorResponse);
  }

  private selectLogLevel(severity: string): "error" | "warn" | "debug" {
    switch (severity) {
      case "critical":
      case "high":
        return "error";
      case "medium":
        return "warn";
      case "low":
      default:
        return "debug";
    }
  }
}
