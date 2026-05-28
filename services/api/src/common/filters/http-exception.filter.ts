import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("HttpExceptionFilter");
  private readonly isProduction = process.env["NODE_ENV"] === "production";

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<{ status: (code: number) => { send: (body: unknown) => void } }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Erro interno do servidor";
    let errors: unknown = undefined;

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
      // Log full error details but don't expose them in production
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
