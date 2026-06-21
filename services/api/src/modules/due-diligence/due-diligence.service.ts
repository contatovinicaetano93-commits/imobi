import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DueDiligenceStatus, Prisma } from "@prisma/client";
import type { CriarDueDiligenceInput, AtualizarDueDiligenceStatusInput } from "@imbobi/schemas";

export type CriarDueDiligenceDto = CriarDueDiligenceInput;
export type AtualizarStatusDto = AtualizarDueDiligenceStatusInput;

@Injectable()
export class DueDiligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(gestorId: string, dto: CriarDueDiligenceDto) {
    return this.prisma.dueDiligence.create({
      data: {
        gestorId,
        nomeEmpreendimento: dto.nomeEmpreendimento,
        tipologia: dto.tipologia ?? null,
        endereco: dto.endereco ?? null,
        cidade: dto.cidade ?? null,
        uf: dto.uf ?? null,
        totalUnidades: dto.totalUnidades ?? null,
        nomeIncorporadora: dto.nomeIncorporadora ?? null,
        cnpjIncorporadora: dto.cnpjIncorporadora ?? null,
        modeloAmortizacao: dto.modeloAmortizacao ?? null,
        totalCarteira: dto.totalCarteira ?? null,
        totalAReceber: dto.totalAReceber ?? null,
        estruturaSocietaria: dto.estruturaSocietaria ?? null,
        payload: dto.payload as Prisma.InputJsonValue,
        status: DueDiligenceStatus.ENVIADO,
      },
    });
  }

  async listar(gestorId: string, limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.dueDiligence.findMany({
        where: { gestorId },
        orderBy: { criadoEm: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          nomeEmpreendimento: true,
          tipologia: true,
          cidade: true,
          uf: true,
          status: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      }),
      this.prisma.dueDiligence.count({ where: { gestorId } }),
    ]);
    return { items, total };
  }

  async buscar(id: string, gestorId: string, isAdmin: boolean) {
    const dd = await this.prisma.dueDiligence.findUnique({ where: { id } });
    if (!dd) throw new NotFoundException("Due diligence não encontrada");
    if (!isAdmin && dd.gestorId !== gestorId) {
      throw new ForbiddenException("Acesso negado");
    }
    return dd;
  }

  async atualizarStatus(id: string, dto: AtualizarStatusDto) {
    const dd = await this.prisma.dueDiligence.findUnique({ where: { id } });
    if (!dd) throw new NotFoundException("Due diligence não encontrada");
    return this.prisma.dueDiligence.update({
      where: { id },
      data: { status: dto.status as DueDiligenceStatus },
    });
  }
}
