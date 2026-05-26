import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPerfil(usuarioId: string) {
    return this.prisma.usuario.findUnique({
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
  }

  async atualizarPerfil(usuarioId: string, data: { nome?: string; telefone?: string }) {
    return this.prisma.usuario.update({
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
  }
}
