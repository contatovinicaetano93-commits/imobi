import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import type { FastifyReply } from "fastify";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

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
      console.error("[HttpExceptionFilter] Unhandled error:", exception.message, exception.stack);
      message = "Erro interno do servidor";
    }

    reply.code(status).send({
      statusCode: status,
      message,
      error: errors,
      timestamp: new Date().toISOString(),
    });
  }
}
