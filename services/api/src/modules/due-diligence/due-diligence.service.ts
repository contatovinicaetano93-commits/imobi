import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DueDiligenceStatus, Prisma } from "@prisma/client";

export interface CriarDueDiligenceDto {
  nomeEmpreendimento: string;
  tipologia?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  totalUnidades?: number | null;
  nomeIncorporadora?: string;
  cnpjIncorporadora?: string;
  modeloAmortizacao?: string | null;
  totalCarteira?: number | null;
  totalAReceber?: number | null;
  estruturaSocietaria?: string;
  payload: Prisma.InputJsonValue;
}

export interface AtualizarStatusDto {
  status: DueDiligenceStatus;
}

@Injectable()
export class DueDiligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(gestorId: string, dto: CriarDueDiligenceDto) {
    return this.prisma.dueDiligence.create({
      data: {
        usuarioId: gestorId,
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
        payload: dto.payload,
        status: DueDiligenceStatus.ENVIADO,
      },
    });
  }

  async listar(gestorId: string) {
    return this.prisma.dueDiligence.findMany({
      where: { OR: [{ gestorId }, { usuarioId: gestorId }] },
      orderBy: { criadoEm: "desc" },
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
    });
  }

  async buscar(id: string, gestorId: string, isAdmin: boolean) {
    const dd = await this.prisma.dueDiligence.findUnique({ where: { id } });
    if (!dd) throw new NotFoundException("Due diligence não encontrada");
    if (!isAdmin && dd.gestorId !== gestorId && dd.usuarioId !== gestorId) {
      throw new ForbiddenException("Acesso negado");
    }
    return dd;
  }

  async atualizarStatus(id: string, dto: AtualizarStatusDto) {
    const dd = await this.prisma.dueDiligence.findUnique({ where: { id } });
    if (!dd) throw new NotFoundException("Due diligence não encontrada");
    return this.prisma.dueDiligence.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
