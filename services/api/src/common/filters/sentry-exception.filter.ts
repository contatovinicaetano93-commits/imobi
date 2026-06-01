import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    const details = {};

    if (exception instanceof Error) {
      message = exception.message;

      // Capture com contexto da requisição
      Sentry.captureException(exception, {
        tags: {
          method: request.method,
          path: request.path,
          statusCode: status,
        },
        extra: {
          body: request.body,
          query: request.query,
          params: request.params,
        },
      });
    } else {
      Sentry.captureMessage(String(exception), "error");
    }

    // Detectar status HTTP se disponível
    if (
      exception instanceof Object &&
      "getStatus" in exception &&
      typeof (exception as any).getStatus === "function"
    ) {
      status = (exception as any).getStatus();
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.path,
      ...(process.env.NODE_ENV !== "production" && { details }),
    });
  }
}
