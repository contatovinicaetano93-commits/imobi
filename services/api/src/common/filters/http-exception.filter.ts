import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
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
      // Never expose internal error details (Prisma errors, stack traces, schema names)
      message = "Erro interno do servidor";
    }

    reply.status(status).send({
      statusCode: status,
      message,
      error: errors,
      timestamp: new Date().toISOString(),
    });
  }
}
