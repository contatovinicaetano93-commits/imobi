import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { DadosBancariosInput } from "@imbobi/schemas";

@Injectable()
export class DadosBancariosService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(usuarioId: string, dto: DadosBancariosInput) {
    const payload = {
      banco: dto.banco,
      agencia: dto.agencia ?? null,
      conta: dto.conta ?? null,
      tipoConta: dto.tipoConta ?? "CORRENTE",
      tipoChavePix: dto.tipoChavePix ?? null,
      chavePix: dto.chavePix ?? null,
      nomeTitular: dto.nomeTitular,
      cpfCnpjTitular: dto.cpfCnpjTitular,
    } as const;

    const dados = await this.prisma.dadosBancarios.upsert({
      where: { usuarioId },
      create: { usuarioId, ...payload },
      update: { ...payload },
    });

    // Ao cadastrar dados bancários, mover acoes pendentes para AGUARDANDO_TRANSFERENCIA
    await this.prisma.acaoOperador.updateMany({
      where: {
        usuarioId,
        status: "AGUARDANDO_DADOS_BANCARIOS",
      },
      data: {
        dadosBancariosId: dados.dadosBancariosId,
        status: "AGUARDANDO_TRANSFERENCIA",
      },
    });

    return dados;
  }

  async buscarMeus(usuarioId: string) {
    const dados = await this.prisma.dadosBancarios.findUnique({
      where: { usuarioId },
    });
    if (!dados) throw new NotFoundException("Dados bancários não cadastrados.");
    return dados;
  }

  async excluir(usuarioId: string) {
    await this.prisma.dadosBancarios.delete({ where: { usuarioId } });
    return { ok: true };
  }
}
