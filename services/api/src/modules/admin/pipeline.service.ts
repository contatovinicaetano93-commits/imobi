import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  PropostaCreditoStatus,
  SolicitacaoStatus,
  type PropostaCredito,
  type SolicitacaoCredito,
} from "@prisma/client";
import { getTipoCreditoMeta } from "@imbobi/schemas";
import type { TipoCreditoProposta as TipoCreditoPropostaSchema } from "@imbobi/schemas";
import { PrismaService } from "../prisma/prisma.service";
import type { CriarPipelineLeadDto, PipelineEtapa } from "./dto/pipeline.dto";

export type PipelineFonte = "proposta" | "solicitacao";

export interface PipelineItemResponse {
  id: string;
  fonte: PipelineFonte;
  etapa: PipelineEtapa;
  nome: string;
  local: string | null;
  tipo: string;
  valor: number | null;
  valorFormatado: string | null;
  contato: string;
  email: string;
  telefone: string | null;
  notas: string | null;
  responsavel: string | null;
  vendido: string | null;
  construido: string | null;
  grupoWhatsApp: string | null;
  grupoLink: string | null;
  href: string;
  criadoEm: string;
  atualizadoEm: string;
  usuarioId: string | null;
  statusOperacional: string;
}

@Injectable()
export class PipelineService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(): Promise<{ items: PipelineItemResponse[]; atualizadoEm: string }> {
    const [propostas, solicitacoes, creditosAtivos] = await Promise.all([
      this.prisma.propostaCredito.findMany({
        orderBy: { criadoEm: "desc" },
        take: 100,
      }),
      this.prisma.solicitacaoCredito.findMany({
        where: { status: { not: "CANCELADA" } },
        orderBy: { criadoEm: "desc" },
        take: 100,
        include: {
          usuario: { select: { nome: true, email: true, usuarioId: true } },
          comite: { select: { comiteId: true, status: true, decisao: true } },
        },
      }),
      this.prisma.credito.findMany({
        where: { status: "ATIVO" },
        select: { usuarioId: true, creditoId: true },
      }),
    ]);

    const usuariosComSolicitacao = new Set(solicitacoes.map((s) => s.usuarioId));
    const creditoPorUsuario = new Map(creditosAtivos.map((c) => [c.usuarioId, c.creditoId]));

    const items: PipelineItemResponse[] = [];

    for (const s of solicitacoes) {
      items.push(this.mapSolicitacao(s, creditoPorUsuario.has(s.usuarioId)));
    }

    for (const p of propostas) {
      if (p.usuarioId && usuariosComSolicitacao.has(p.usuarioId)) continue;
      if (
        !p.usuarioId &&
        solicitacoes.some(
          (s) => s.usuario.email.toLowerCase() === p.email.trim().toLowerCase(),
        )
      ) {
        continue;
      }
      items.push(
        this.mapProposta(
          p,
          p.usuarioId ? creditoPorUsuario.has(p.usuarioId) : false,
          p.usuarioId ? usuariosComSolicitacao.has(p.usuarioId) : false,
        ),
      );
    }

    items.sort(
      (a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime(),
    );

    return { items, atualizadoEm: new Date().toISOString() };
  }

  async atualizarEtapa(fonte: PipelineFonte, id: string, etapa: PipelineEtapa) {
    if (fonte === "proposta") {
      return this.atualizarEtapaProposta(id, etapa);
    }
    return this.atualizarEtapaSolicitacao(id, etapa);
  }

  async criarLead(body: CriarPipelineLeadDto) {
    const status = this.propostaStatusFromEtapa(body.etapa);
    const narrativa = [
      body.notas?.trim(),
      body.local?.trim() ? `Local: ${body.local.trim()}` : null,
      body.valorEstimado
        ? `Valor estimado: ${this.formatarBRL(body.valorEstimado)}`
        : null,
      "[Origem: Pipeline Admin]",
    ]
      .filter(Boolean)
      .join("\n");

    const proposta = await this.prisma.propostaCredito.create({
      data: {
        tipoCredito: body.tipoCredito,
        nomeEmpreendimento: body.nomeEmpreendimento,
        nomeContato: body.nomeContato,
        email: body.email.trim(),
        telefone: (body.telefone ?? "0000000000").replace(/\D/g, ""),
        empresa: body.contato?.trim() || null,
        narrativa: narrativa || null,
        status,
        arquivos: [],
      },
    });

    return this.mapProposta(proposta, false, false);
  }

  async excluir(fonte: PipelineFonte, id: string) {
    if (fonte === "proposta") {
      const p = await this.prisma.propostaCredito.findUnique({ where: { id } });
      if (!p) throw new NotFoundException("Proposta não encontrada.");
      await this.prisma.propostaCredito.update({
        where: { id },
        data: { status: PropostaCreditoStatus.REJEITADA },
      });
      return { ok: true };
    }

    const s = await this.prisma.solicitacaoCredito.findUnique({ where: { solicitacaoId: id } });
    if (!s) throw new NotFoundException("Solicitação não encontrada.");
    if (s.status === "APROVADA") {
      throw new BadRequestException("Não é possível arquivar solicitação já aprovada.");
    }
    await this.prisma.solicitacaoCredito.update({
      where: { solicitacaoId: id },
      data: { status: SolicitacaoStatus.CANCELADA },
    });
    return { ok: true };
  }

  private mapProposta(
    p: PropostaCredito,
    creditoAtivo: boolean,
    solicitacaoAtiva: boolean,
  ): PipelineItemResponse {
    const tipo =
      getTipoCreditoMeta(p.tipoCredito as TipoCreditoPropostaSchema)?.label ?? p.tipoCredito;

    return {
      id: p.id,
      fonte: "proposta",
      etapa: this.etapaFromProposta(p.status, p.usuarioId, creditoAtivo, solicitacaoAtiva),
      nome: p.nomeEmpreendimento,
      local: this.extractLocal(p.narrativa),
      tipo,
      valor: null,
      valorFormatado: null,
      contato: p.nomeContato,
      email: p.email,
      telefone: p.telefone,
      notas: p.narrativa,
      responsavel: null,
      vendido: null,
      construido: p.percentualFisico != null ? `${p.percentualFisico}%` : null,
      grupoWhatsApp: null,
      grupoLink: null,
      href: p.usuarioId ? "/dashboard/admin/viabilidade" : "/dashboard/admin/propostas",
      criadoEm: p.criadoEm.toISOString(),
      atualizadoEm: p.atualizadoEm.toISOString(),
      usuarioId: p.usuarioId,
      statusOperacional: p.status,
    };
  }

  private mapSolicitacao(
    s: SolicitacaoCredito & {
      usuario: { nome: string; email: string; usuarioId: string };
      comite: { comiteId: string; status: string; decisao: string | null } | null;
    },
    creditoAtivo: boolean,
  ): PipelineItemResponse {
    return {
      id: s.solicitacaoId,
      fonte: "solicitacao",
      etapa: this.etapaFromSolicitacao(s.status, creditoAtivo),
      nome: `${s.usuario.nome} — ${this.formatarBRL(s.valorSolicitado)}`,
      local: null,
      tipo: s.finalidade,
      valor: s.valorSolicitado,
      valorFormatado: this.formatarBRL(s.valorSolicitado),
      contato: s.usuario.nome,
      email: s.usuario.email,
      telefone: null,
      notas: s.observacoes,
      responsavel: null,
      vendido: s.ltv != null ? `LTV ${Math.round(s.ltv * 100)}%` : null,
      construido: null,
      grupoWhatsApp: null,
      grupoLink: null,
      href: s.comite
        ? `/dashboard/admin/comite`
        : "/dashboard/admin/comite",
      criadoEm: s.criadoEm.toISOString(),
      atualizadoEm: s.atualizadoEm.toISOString(),
      usuarioId: s.usuarioId,
      statusOperacional: s.status,
    };
  }

  private etapaFromProposta(
    status: PropostaCreditoStatus,
    usuarioId: string | null,
    creditoAtivo: boolean,
    solicitacaoAtiva: boolean,
  ): PipelineEtapa {
    if (status === PropostaCreditoStatus.REJEITADA) return "standby";
    if (creditoAtivo) return "aprovado";
    if (status === PropostaCreditoStatus.APROVADA && solicitacaoAtiva) return "estruturacao";
    if (status === PropostaCreditoStatus.APROVADA) return "estruturacao";
    if (status === PropostaCreditoStatus.EM_ANALISE) return "analise";
    if (!usuarioId) return "prospeccao";
    return "analise";
  }

  private etapaFromSolicitacao(status: SolicitacaoStatus, creditoAtivo: boolean): PipelineEtapa {
    if (status === SolicitacaoStatus.REPROVADA || status === SolicitacaoStatus.AJUSTADA) {
      return "standby";
    }
    if (status === SolicitacaoStatus.APROVADA && creditoAtivo) return "aprovado";
    if (
      status === SolicitacaoStatus.APROVADA ||
      status === SolicitacaoStatus.EM_COMITE ||
      status === SolicitacaoStatus.PENDENTE
    ) {
      return "estruturacao";
    }
    return "analise";
  }

  private propostaStatusFromEtapa(etapa: PipelineEtapa): PropostaCreditoStatus {
    switch (etapa) {
      case "prospeccao":
        return PropostaCreditoStatus.RECEBIDA;
      case "analise":
        return PropostaCreditoStatus.EM_ANALISE;
      case "estruturacao":
      case "aprovado":
        return PropostaCreditoStatus.APROVADA;
      case "standby":
        return PropostaCreditoStatus.REJEITADA;
      default:
        return PropostaCreditoStatus.RECEBIDA;
    }
  }

  private async atualizarEtapaProposta(id: string, etapa: PipelineEtapa) {
    const p = await this.prisma.propostaCredito.findUnique({ where: { id } });
    if (!p) throw new NotFoundException("Proposta não encontrada.");
    const status = this.propostaStatusFromEtapa(etapa);
    const updated = await this.prisma.propostaCredito.update({
      where: { id },
      data: { status },
    });
    return this.mapProposta(updated, false, false);
  }

  private async atualizarEtapaSolicitacao(id: string, etapa: PipelineEtapa) {
    const s = await this.prisma.solicitacaoCredito.findUnique({
      where: { solicitacaoId: id },
      include: {
        usuario: { select: { nome: true, email: true, usuarioId: true } },
        comite: { select: { comiteId: true, status: true, decisao: true } },
      },
    });
    if (!s) throw new NotFoundException("Solicitação não encontrada.");

    if (etapa === "aprovado") {
      throw new BadRequestException(
        "Use o Comitê Digital para aprovar crédito — a etapa Aprovado é automática após votação.",
      );
    }

    if (etapa === "standby") {
      if (s.status === "APROVADA") {
        throw new BadRequestException("Solicitação aprovada não pode ir para Standby.");
      }
      await this.prisma.solicitacaoCredito.update({
        where: { solicitacaoId: id },
        data: { status: SolicitacaoStatus.CANCELADA },
      });
    }

    const creditoAtivo = await this.prisma.credito.findFirst({
      where: { usuarioId: s.usuarioId, status: "ATIVO" },
      select: { creditoId: true },
    });

    const refreshed = await this.prisma.solicitacaoCredito.findUniqueOrThrow({
      where: { solicitacaoId: id },
      include: {
        usuario: { select: { nome: true, email: true, usuarioId: true } },
        comite: { select: { comiteId: true, status: true, decisao: true } },
      },
    });

    return this.mapSolicitacao(refreshed, !!creditoAtivo);
  }

  private extractLocal(narrativa: string | null): string | null {
    if (!narrativa) return null;
    const match = narrativa.match(/Local:\s*(.+)/i);
    return match?.[1]?.trim() ?? null;
  }

  private formatarBRL(valor: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(valor);
  }
}
