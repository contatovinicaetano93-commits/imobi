import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export interface UsuarioAtual {
  id: string;
  tipo: string;
}

export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioAtual => {
    const request = ctx.switchToHttp().getRequest<{ user: UsuarioAtual }>();
    return request.user;
  }
);
