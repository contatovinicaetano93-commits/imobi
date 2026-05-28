import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import * as Sentry from "@sentry/node";

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("SentryExceptionFilter");
  private readonly isProduction = process.env["NODE_ENV"] === "production";
  private readonly sentryEnabled = !!process.env["SENTRY_DSN"];

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<{ status: (code: number) => { send: (body: unknown) => void } }>();
    const request = ctx.getRequest<{ url: string; method: string; user?: unknown }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Erro interno do servidor";
    let errors: unknown = undefined;

    // Extract relevant information for context
    const context = {
      url: request.url,
      method: request.method,
      userId: (request.user as any)?.id,
    };

    // Capture the error in Sentry
    if (this.sentryEnabled) {
      Sentry.setContext("request", context);

      if (exception instanceof HttpException) {
        // Only capture errors and above for HTTP exceptions
        if (exception.getStatus() >= 500) {
          Sentry.captureException(exception);
        }
      } else {
        // Capture all non-HTTP exceptions
        Sentry.captureException(exception);
      }
    }

    // Handle different exception types
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === "object" && response !== null) {
        const obj = response as Record<string, unknown>;
        message = (obj.message as string) || exception.message;
        errors = obj.error;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
      if (!this.isProduction) {
        message = exception.message;
      }
    }

    reply.status(status).send({
      statusCode: status,
      message,
      error: errors,
      timestamp: new Date().toISOString(),
    });
  }
}
