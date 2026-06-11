import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AdminOverview {
  totalUsuarios: number;
  obrasAtivas: number;
  obrasTotal: number;
  creditoAprovado: number;
  creditoLiberado: number;
  kycPendentes: number;
  etapasPendentes: number;
  visitasAgendadas: number;
  filaLiberacao: number;
}

export interface Atividade {
  id: string;
  tipo: string;
  descricao: string;
  criadoEm: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<AdminOverview> {
    const [
      totalUsuarios,
      obrasAtivas,
      obrasTotal,
      creditosAgregados,
      kycPendentes,
      etapasPendentes,
      filaLiberacao,
    ] = await Promise.all([
      this.prisma.usuario.count({
        where: { deletadoEm: null },
      }),
      this.prisma.obra.count({
        where: { status: "EM_EXECUCAO" },
      }),
      this.prisma.obra.count(),
      this.prisma.credito.aggregate({
        where: { status: { in: ["ATIVO"] } },
        _sum: {
          valorAprovado: true,
          valorLiberado: true,
        },
      }),
      this.prisma.kycDocumento.count({
        where: { status: { in: ["PENDENTE"] } },
      }),
      this.prisma.etapaObra.count({
        where: { status: "AGUARDANDO_VISTORIA" },
      }),
      this.prisma.etapaObra.count({
        where: { status: "CONCLUIDA" },
      }),
    ]);

    return {
      totalUsuarios,
      obrasAtivas,
      obrasTotal,
      creditoAprovado: creditosAgregados._sum.valorAprovado ?? 0,
      creditoLiberado: creditosAgregados._sum.valorLiberado ?? 0,
      kycPendentes,
      etapasPendentes,
      visitasAgendadas: etapasPendentes,
      filaLiberacao,
    };
  }

  async atividades(limit: number): Promise<Atividade[]> {
    const [etapasAudit, kycDocs, creditos] = await Promise.all([
      this.prisma.etapaAuditLog.findMany({
        orderBy: { criadoEm: "desc" },
        take: limit,
        include: {
          etapa: { select: { nome: true } },
        },
      }),
      this.prisma.kycDocumento.findMany({
        orderBy: { criadoEm: "desc" },
        take: limit,
        include: {
          usuario: { select: { nome: true } },
        },
      }),
      this.prisma.credito.findMany({
        orderBy: { criadoEm: "desc" },
        take: limit,
        include: {
          usuario: { select: { nome: true } },
        },
      }),
    ]);

    const eventos: Atividade[] = [
      ...etapasAudit.map((log) => ({
        id: log.auditId,
        tipo: `ETAPA_${log.acaoTipo}`,
        descricao: `Etapa "${log.etapa.nome}" ${log.acaoTipo.toLowerCase()}`,
        criadoEm: log.criadoEm.toISOString(),
      })),
      ...kycDocs.map((doc) => ({
        id: doc.kycDocumentoId,
        tipo: "KYC_ENVIADO",
        descricao: `KYC "${doc.tipo}" enviado por ${doc.usuario.nome}`,
        criadoEm: doc.criadoEm.toISOString(),
      })),
      ...creditos.map((c) => ({
        id: c.creditoId,
        tipo: "CREDITO_SOLICITADO",
        descricao: `Crédito R$ ${c.valorAprovado.toFixed(2)} solicitado por ${c.usuario.nome}`,
        criadoEm: c.criadoEm.toISOString(),
      })),
    ];

    eventos.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );

    return eventos.slice(0, limit);
  }
}
