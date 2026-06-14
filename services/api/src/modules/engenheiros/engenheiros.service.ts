import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface ObraFinanceiro {
  obraId: string;
  nome: string;
  valorTotal: number;
  valorMaterial: number;
  valorMaoDeObra: number;
  valorExecutado: number;
  progresso: number;
  etapaAtual: string;
}

@Injectable()
export class EngenheirosService {
  constructor(private readonly prisma: PrismaService) {}

  async listarVisitas(usuarioId: string) {
    // Visitas = etapas AGUARDANDO_VISTORIA ou recentemente concluídas, de obras do sistema
    // O engenheiro vê etapas que precisam de vistoria presencial
    const etapas = await this.prisma.etapaObra.findMany({
      where: {
        status: { in: ["AGUARDANDO_VISTORIA", "APROVADA_ENGENHEIRO", "CONCLUIDA", "REPROVADA"] as any },
      },
      include: {
        obra: { select: { obraId: true, nome: true, endereco: true, geoLatitude: true, geoLongitude: true, raioValidacaoMetros: true } },
        evidencias: {
          select: { evidenciaId: true, fotoUrl: true, latCaptura: true, lngCaptura: true, accuracyMetros: true, distanciaObra: true, criadoEm: true },
          orderBy: { criadoEm: "desc" },
        },
      },
      orderBy: { atualizadoEm: "asc" },
      take: 50,
    });

    return etapas.map((e) => ({
      visitaId: e.etapaId,
      status: e.status,
      etapaId: e.etapaId,
      etapaNome: e.nome,
      percentualObra: Number(e.percentualObra),
      valorLiberacao: Number(e.valorLiberacao),
      obraId: e.obra.obraId,
      obraNome: e.obra.nome,
      obraEndereco: e.obra.endereco,
      obraLat: e.obra.geoLatitude,
      obraLng: e.obra.geoLongitude,
      raioMetros: e.obra.raioValidacaoMetros,
      totalEvidencias: e.evidencias.length,
      aguardandoDesde: e.atualizadoEm.toISOString(),
      criadoEm: e.criadoEm.toISOString(),
    }));
  }

  async obterVisita(visitaId: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId: visitaId },
      include: {
        obra: { select: { obraId: true, nome: true, endereco: true, geoLatitude: true, geoLongitude: true, raioValidacaoMetros: true } },
        evidencias: {
          select: { evidenciaId: true, fotoUrl: true, latCaptura: true, lngCaptura: true, accuracyMetros: true, distanciaObra: true, validada: true, criadoEm: true },
          orderBy: { criadoEm: "desc" },
        },
      },
    });
    if (!etapa) throw new NotFoundException("Visita não encontrada.");
    return {
      etapaId: etapa.etapaId,
      etapaNome: etapa.nome,
      status: etapa.status,
      percentualObra: Number(etapa.percentualObra),
      valorLiberacao: Number(etapa.valorLiberacao),
      obraId: etapa.obra.obraId,
      obraNome: etapa.obra.nome,
      obraEndereco: etapa.obra.endereco,
      obraLat: etapa.obra.geoLatitude,
      obraLng: etapa.obra.geoLongitude,
      raioMetros: etapa.obra.raioValidacaoMetros,
      aguardandoDesde: etapa.atualizadoEm.toISOString(),
      evidencias: etapa.evidencias.map((ev) => ({
        evidenciaId: ev.evidenciaId,
        fotoUrl: ev.fotoUrl,
        latCaptura: ev.latCaptura,
        lngCaptura: ev.lngCaptura,
        accuracyMetros: ev.accuracyMetros,
        distanciaObra: ev.distanciaObra,
        validada: ev.validada,
        criadoEm: ev.criadoEm.toISOString(),
      })),
    };
  }

  async atualizarVisita(
    usuarioId: string,
    visitaId: string,
    data: { status?: string; dataAgendada?: string; observacoes?: string }
  ) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId: visitaId },
    });
    if (!etapa) throw new NotFoundException("Visita não encontrada.");

    const usuario = await this.prisma.usuario.findUnique({ where: { usuarioId } });
    if (!usuario) throw new ForbiddenException("Usuário não encontrado.");

    const statusMap: Record<string, string> = {
      INICIADA: "EM_EXECUCAO",
      CONCLUIDA: "CONCLUIDA",
    };

    const newStatus = data.status ? statusMap[data.status] : undefined;

    await this.prisma.etapaObra.update({
      where: { etapaId: visitaId },
      data: { ...(newStatus ? { status: newStatus as any } : {}) },
    });

    return this.obterVisita(visitaId);
  }

  async financeiro(_usuarioId: string): Promise<ObraFinanceiro[]> {
    // Obras que possuem etapas em vistoria ou execução (proxy para obras com visitas do engenheiro)
    const obras = await this.prisma.obra.findMany({
      where: {
        etapas: {
          some: {
            status: { in: ["AGUARDANDO_VISTORIA", "EM_EXECUCAO", "CONCLUIDA"] },
          },
        },
      },
      include: {
        etapas: {
          select: {
            nome: true,
            valorLiberacao: true,
            status: true,
          },
        },
      },
      take: 50,
    });

    return obras.map((obra) => {
      const valorTotal = obra.etapas.reduce((sum, e) => sum + e.valorLiberacao, 0);
      const valorExecutado = obra.etapas
        .filter((e) => e.status === "CONCLUIDA")
        .reduce((sum, e) => sum + e.valorLiberacao, 0);

      const progresso = valorTotal > 0
        ? Math.round((valorExecutado / valorTotal) * 100)
        : 0;

      const etapaAtual =
        obra.etapas.find(
          (e) => e.status === "AGUARDANDO_VISTORIA" || e.status === "EM_EXECUCAO"
        )?.nome ?? "";

      return {
        obraId: obra.obraId,
        nome: obra.nome,
        valorTotal,
        valorMaterial: Math.round(valorTotal * 0.56 * 100) / 100,
        valorMaoDeObra: Math.round(valorTotal * 0.44 * 100) / 100,
        valorExecutado,
        progresso,
        etapaAtual,
      };
    });
  }

  async licencas(): Promise<unknown[]> {
    // Tabela Licenca não existe no schema atual — retorna array vazio com segurança
    return (this.prisma as any).licenca
      ? (this.prisma as any).licenca
          .findMany({ orderBy: { criadoEm: "desc" } })
          .catch(() => [])
      : Promise.resolve([]);
  }
}
