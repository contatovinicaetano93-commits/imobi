import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ManagerService {
  constructor(private readonly prisma: PrismaService) {}

  async verificarPermissao(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
    });
    if (!usuario || (usuario.tipo !== "GESTOR_OBRA" && usuario.tipo !== "ADMIN")) {
      throw new ForbiddenException("Acesso negado. Apenas gestores podem acessar.");
    }
  }

  async listarEtapasPendentes(limit = 20, offset = 0) {
    const [etapas, total] = await Promise.all([
      this.prisma.etapaObra.findMany({
        where: { status: "AGUARDANDO_VISTORIA" },
        include: {
          obra: {
            include: {
              usuario: { select: { usuarioId: true, nome: true, email: true, cpf: true } },
              credito: true,
            },
          },
          evidencias: {
            where: { validada: true },
            select: { evidenciaId: true, fotoUrl: true, criadoEm: true },
          },
        },
        orderBy: { criadoEm: "asc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.etapaObra.count({
        where: { status: "AGUARDANDO_VISTORIA" },
      }),
    ]);

    return {
      etapas: etapas.map((e) => ({
        etapaId: e.etapaId,
        nome: e.nome,
        ordem: e.ordem,
        percentualObra: e.percentualObra,
        valorLiberacao: e.valorLiberacao,
        evidenciasCount: e.evidencias.length,
        criadoEm: e.criadoEm,
        obra: {
          obraId: e.obra.obraId,
          nome: e.obra.nome,
          endereco: e.obra.endereco,
          usuario: e.obra.usuario,
          credito: e.obra.credito && {
            creditoId: e.obra.credito.creditoId,
            valorAprovado: e.obra.credito.valorAprovado,
          },
        },
      })),
      total,
    };
  }

  async listarKycPendentes(limit = 20, offset = 0) {
    const [documentos, total] = await Promise.all([
      this.prisma.kycDocumento.findMany({
        where: { status: "PENDENTE" },
        include: {
          usuario: {
            select: {
              usuarioId: true,
              nome: true,
              email: true,
              cpf: true,
              kycStatus: true,
            },
          },
        },
        orderBy: { criadoEm: "asc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.kycDocumento.count({
        where: { status: "PENDENTE" },
      }),
    ]);

    return { documentos, total };
  }

  async obterEtapaDetalhe(etapaId: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: {
        obra: {
          include: {
            usuario: { select: { usuarioId: true, nome: true, email: true, cpf: true } },
            credito: true,
          },
        },
        evidencias: {
          where: { validada: true },
          include: { etapa: { select: { nome: true } } },
        },
      },
    });

    if (!etapa) return null;

    return {
      ...etapa,
      valorLiberacao: Number(etapa.valorLiberacao),
      obra: {
        ...etapa.obra,
        credito: etapa.obra.credito && {
          ...etapa.obra.credito,
          valorAprovado: Number(etapa.obra.credito.valorAprovado),
          valorLiberado: Number(etapa.obra.credito.valorLiberado),
        },
      },
    };
  }

  async obterKycDetalhe(kycDocumentoId: string) {
    return this.prisma.kycDocumento.findUnique({
      where: { kycDocumentoId },
      include: {
        usuario: {
          select: {
            usuarioId: true,
            nome: true,
            email: true,
            cpf: true,
            kycStatus: true,
            criadoEm: true,
          },
        },
      },
    });
  }

  async obterEstatisticas() {
    const [etapasPendentes, kycPendentes, creditosAtivos, obrasAtivas] = await Promise.all([
      this.prisma.etapaObra.count({ where: { status: "AGUARDANDO_VISTORIA" } }),
      this.prisma.kycDocumento.count({ where: { status: "PENDENTE" } }),
      this.prisma.credito.count({ where: { status: "ATIVO" } }),
      this.prisma.obra.count({ where: { status: "EM_EXECUCAO" } }),
    ]);

    return {
      filaAprovacoes: etapasPendentes,
      filaKyc: kycPendentes,
      creditosAtivos,
      obrasAtivas,
    };
  }
}
