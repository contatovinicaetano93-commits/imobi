import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ConstrutorService {
  constructor(private readonly prisma: PrismaService) {}

  async resumo(usuarioId: string) {
    const [usuario, creditos, obras, scoreHistorico, solicitacoes] = await Promise.all([
      this.prisma.usuario.findUnique({
        where: { usuarioId },
        select: { nome: true, kycStatus: true, tipo: true },
      }),
      this.prisma.credito.findMany({
        where: { usuarioId, status: { in: ["ATIVO", "SUSPENSO"] } },
        select: {
          creditoId: true,
          valorAprovado: true,
          valorLiberado: true,
          taxaMensal: true,
          prazoMeses: true,
          status: true,
          dataVencimento: true,
          criadoEm: true,
        },
        orderBy: { criadoEm: "desc" },
        take: 1,
      }),
      this.prisma.obra.findMany({
        where: { usuarioId },
        select: {
          obraId: true,
          nome: true,
          status: true,
          etapas: { select: { status: true } },
        },
        take: 50,
      }),
      this.prisma.scoreHistorico.findFirst({
        where: { usuarioId },
        orderBy: { criadoEm: "desc" },
        select: { score: true },
      }),
      this.prisma.solicitacaoCredito.findMany({
        where: { usuarioId },
        orderBy: { criadoEm: "desc" },
        take: 3,
        select: {
          solicitacaoId: true,
          valorSolicitado: true,
          prazoMeses: true,
          status: true,
          ratingCalculado: true,
          criadoEm: true,
          comite: { select: { status: true, decisao: true, decisaoEm: true } },
        },
      }),
    ]);

    if (!usuario) throw new NotFoundException("Usuário não encontrado");

    const creditoAtivo = creditos[0] ?? null;
    const obrasAtivas = obras.filter((o) => o.status === "EM_EXECUCAO").length;
    const obrasTotal = obras.length;

    const scoreAtual = scoreHistorico?.score ?? 600;
    const scoreNivel =
      scoreAtual >= 800 ? "Excelente" :
      scoreAtual >= 650 ? "Bom" :
      scoreAtual >= 500 ? "Regular" : "Iniciante";

    const totalEtapas = obras.flatMap((o) => o.etapas).length;
    const etapasConcluidas = obras.flatMap((o) => o.etapas).filter((e) => e.status === "CONCLUIDA").length;
    const progressoGeral =
      totalEtapas > 0 ? Number(((etapasConcluidas / totalEtapas) * 100).toFixed(1)) : 0;

    return {
      usuario: { nome: usuario.nome, kycStatus: usuario.kycStatus },
      scoreAtual,
      scoreNivel,
      credito: creditoAtivo
        ? {
            creditoId: creditoAtivo.creditoId,
            valorAprovado: Number(creditoAtivo.valorAprovado),
            valorLiberado: Number(creditoAtivo.valorLiberado),
            saldoDisponivel: Number(creditoAtivo.valorAprovado) - Number(creditoAtivo.valorLiberado),
            taxaMensal: Number(creditoAtivo.taxaMensal),
            prazoMeses: creditoAtivo.prazoMeses,
            status: creditoAtivo.status,
            dataVencimento: creditoAtivo.dataVencimento?.toISOString() ?? null,
            utilizacaoPercentual:
              Number(creditoAtivo.valorAprovado) > 0
                ? Number(((Number(creditoAtivo.valorLiberado) / Number(creditoAtivo.valorAprovado)) * 100).toFixed(1))
                : 0,
          }
        : null,
      obras: {
        total: obrasTotal,
        ativas: obrasAtivas,
        progressoGeral,
      },
      solicitacoes,
    };
  }

  async cronogramaDesembolsos(usuarioId: string) {
    const obras = await this.prisma.obra.findMany({
      where: { usuarioId },
      select: {
        obraId: true,
        nome: true,
        status: true,
        credito: {
          select: { valorAprovado: true, valorLiberado: true },
        },
        etapas: {
          orderBy: { ordem: "asc" },
          select: {
            etapaId: true,
            nome: true,
            ordem: true,
            percentualObra: true,
            valorLiberacao: true,
            status: true,
            dataConclusaoPrevista: true,
            dataConclusaoReal: true,
          },
        },
      },
    });

    return obras.map((obra) => {
      const totalPrevisto = obra.etapas.reduce((sum, e) => sum + Number(e.valorLiberacao), 0);
      const totalLiberado = obra.etapas
        .filter((e) => e.status === "CONCLUIDA")
        .reduce((sum, e) => sum + Number(e.valorLiberacao), 0);

      return {
        obraId: obra.obraId,
        nome: obra.nome,
        status: obra.status,
        creditoValorAprovado: obra.credito ? Number(obra.credito.valorAprovado) : null,
        creditoValorLiberado: obra.credito ? Number(obra.credito.valorLiberado) : null,
        totalPrevistoEtapas: totalPrevisto,
        totalLiberadoEtapas: totalLiberado,
        etapas: obra.etapas.map((e) => ({
          etapaId: e.etapaId,
          nome: e.nome,
          ordem: e.ordem,
          percentualObra: e.percentualObra,
          valorLiberacao: Number(e.valorLiberacao),
          status: e.status,
          dataPrevista: e.dataConclusaoPrevista?.toISOString() ?? null,
          dataConclusao: e.dataConclusaoReal?.toISOString() ?? null,
          liberada: e.status === "CONCLUIDA",
        })),
      };
    });
  }

  async acompanhamentoTecnico(usuarioId: string) {
    const obras = await this.prisma.obra.findMany({
      where: { usuarioId },
      select: {
        obraId: true,
        nome: true,
        endereco: true,
        status: true,
        geoLatitude: true,
        geoLongitude: true,
        etapas: {
          orderBy: { ordem: "asc" },
          select: {
            etapaId: true,
            nome: true,
            ordem: true,
            status: true,
            dataConclusaoPrevista: true,
            dataConclusaoReal: true,
            evidencias: {
              orderBy: { criadoEm: "desc" },
              take: 3,
              select: {
                evidenciaId: true,
                fotoUrl: true,
                validada: true,
                distanciaObra: true,
                criadoEm: true,
              },
            },
          },
        },
      },
    });

    return obras.map((obra) => {
      const etapas = obra.etapas;
      const concluidas = etapas.filter((e) => e.status === "CONCLUIDA").length;
      const emExecucao = etapas.filter((e) => e.status === "EM_EXECUCAO").length;
      const aguardandoVistoria = etapas.filter((e) => e.status === "AGUARDANDO_VISTORIA").length;

      const etapaAtual = etapas.find(
        (e) => e.status === "AGUARDANDO_VISTORIA" || e.status === "EM_EXECUCAO",
      ) ?? null;

      return {
        obraId: obra.obraId,
        nome: obra.nome,
        endereco: obra.endereco,
        status: obra.status,
        geoLatitude: obra.geoLatitude,
        geoLongitude: obra.geoLongitude,
        progresso: {
          concluidas,
          emExecucao,
          aguardandoVistoria,
          total: etapas.length,
          percentual: etapas.length > 0 ? Number(((concluidas / etapas.length) * 100).toFixed(1)) : 0,
        },
        etapaAtual: etapaAtual
          ? {
              etapaId: etapaAtual.etapaId,
              nome: etapaAtual.nome,
              ordem: etapaAtual.ordem,
              status: etapaAtual.status,
              dataPrevista: etapaAtual.dataConclusaoPrevista?.toISOString() ?? null,
              evidenciasRecentes: etapaAtual.evidencias,
            }
          : null,
        etapas: etapas.map((e) => ({
          etapaId: e.etapaId,
          nome: e.nome,
          ordem: e.ordem,
          status: e.status,
          dataPrevista: e.dataConclusaoPrevista?.toISOString() ?? null,
          dataConclusao: e.dataConclusaoReal?.toISOString() ?? null,
          totalEvidencias: e.evidencias.length,
        })),
      };
    });
  }
}
