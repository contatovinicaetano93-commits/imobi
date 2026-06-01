import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class ManagerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const usuarioId = request.user?.sub;

    if (!usuarioId) {
      throw new ForbiddenException('User not authenticated');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { tipo: true },
    });

    if (!usuario || (usuario.tipo !== 'GESTOR_OBRA' && usuario.tipo !== 'ADMIN')) {
      throw new ForbiddenException('Acesso negado. Apenas gestores podem acessar.');
    }

    return true;
  }
}
