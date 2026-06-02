import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async buscarPerfil(usuarioId: string) {
    try {
      this.logger.debug(`Fetching user profile: usuarioId=${usuarioId}`);
      const perfil = await this.prisma.usuario.findUnique({
        where: { usuarioId },
        select: {
          usuarioId: true,
          nome: true,
          cpf: true,
          email: true,
          telefone: true,
          tipo: true,
          kycStatus: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      });
      if (perfil) {
        this.logger.debug(
          `User profile fetched successfully: usuarioId=${usuarioId}, tipo=${perfil.tipo}`,
        );
      } else {
        this.logger.warn(`User profile not found: usuarioId=${usuarioId}`);
      }
      return perfil;
    } catch (error) {
      this.logger.error(
        `Failed to fetch user profile: usuarioId=${usuarioId}`,
        error,
      );
      throw error;
    }
  }

  async atualizarPerfil(
    usuarioId: string,
    data: { nome?: string; telefone?: string },
  ) {
    try {
      this.logger.debug(
        `Updating user profile: usuarioId=${usuarioId}, fields=${Object.keys(data).join(", ")}`,
      );
      const usuario = await this.prisma.usuario.update({
        where: { usuarioId },
        data: { ...data, atualizadoEm: new Date() },
        select: {
          usuarioId: true,
          nome: true,
          cpf: true,
          email: true,
          telefone: true,
          tipo: true,
          kycStatus: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      });
      this.logger.log(
        `User profile updated successfully: usuarioId=${usuarioId}`,
      );
      return usuario;
    } catch (error) {
      this.logger.error(
        `Failed to update user profile: usuarioId=${usuarioId}`,
        error,
      );
      throw error;
    }
  }
}
