import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TipoNotificacao } from "@prisma/client";

@Injectable()
export class NotificacoesService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(
    usuarioId: string,
    tipo: TipoNotificacao,
    titulo: string,
    mensagem: string,
    link?: string
  ) {
    return this.prisma.notificacao.create({
      data: { usuarioId, tipo, titulo, mensagem, link },
    });
  }

  async listar(usuarioId: string, limit = 20, offset = 0) {
    const [notificacoes, total] = await Promise.all([
      this.prisma.notificacao.findMany({
        where: { usuarioId },
        orderBy: { criadoEm: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.notificacao.count({ where: { usuarioId } }),
    ]);

    return { notificacoes, total };
  }

  async listarNaoLidas(usuarioId: string) {
    return this.prisma.notificacao.findMany({
      where: { usuarioId, lida: false },
      orderBy: { criadoEm: "desc" },
      take: 50,
    });
  }

  async marcarComoLida(usuarioId: string, notificacaoId: string) {
    return this.prisma.notificacao.updateMany({
      where: { notificacaoId, usuarioId },
      data: { lida: true, lidoEm: new Date() },
    });
  }

  async marcarTudasComoLidas(usuarioId: string) {
    return this.prisma.notificacao.updateMany({
      where: { usuarioId, lida: false },
      data: { lida: true, lidoEm: new Date() },
    });
  }

  async deletar(usuarioId: string, notificacaoId: string) {
    return this.prisma.notificacao.deleteMany({
      where: { notificacaoId, usuarioId },
    });
  }

  async contarNaoLidas(usuarioId: string) {
    return this.prisma.notificacao.count({
      where: { usuarioId, lida: false },
    });
  }
}
