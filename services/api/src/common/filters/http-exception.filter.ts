import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { captureException } from "../config";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

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
      message = "Erro interno do servidor";
    }

    if (status >= 500) {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      captureException(err, {
        path: request.url,
        method: request.method,
        statusCode: status,
      });
    }

    reply.code(status).send({
      statusCode: status,
      message,
      error: errors,
      timestamp: new Date().toISOString(),
    });
  }
}
