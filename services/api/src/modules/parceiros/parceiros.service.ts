import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ParceiroResumo, OperacaoIndicada, ContatoMailing } from './parceiros.types';
import type { AdicionarMailingDto } from './dto/parceiros.dto';

// Taxa de comissão padrão para parceiros (5%)
const PERCENTUAL_COMISSAO_PADRAO = 5;
// Validade de indicação em dias
const VALIDADE_INDICACAO_DIAS = 90;

function obfuscarNomeCliente(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/);
  if (partes.length === 0 || !partes[0]) return '—';
  const primeiro = partes[0];
  if (partes.length === 1) return primeiro;
  const inicialSobrenome = partes[partes.length - 1]?.[0]?.toUpperCase() ?? '';
  return inicialSobrenome ? `${primeiro} ${inicialSobrenome}.` : primeiro;
}

function gerarCodigoIndicacao(usuarioId: string): string {
  // Gera um código legível a partir dos últimos 8 chars do UUID
  const sufixo = usuarioId.replace(/-/g, '').slice(-8).toUpperCase();
  return `PARC-${sufixo}`;
}

function calcularValidadeIndicacao(criadoEm: Date): string {
  const validade = new Date(criadoEm);
  validade.setDate(validade.getDate() + VALIDADE_INDICACAO_DIAS);
  return validade.toISOString();
}

@Injectable()
export class ParceirosService {
  constructor(private readonly prisma: PrismaService) {}

  async getResumo(usuarioId: string): Promise<ParceiroResumo> {
    // Busca leads vinculados ao parceiro com fonte PARCEIRO
    const leads = await this.prisma.lead
      .findMany({
        where: { usuarioId, fonte: 'PARCEIRO' },
        include: {
          stage: true,
        },
      })
      .catch(() => [] as typeof leads);

    const operacoesAtivas = leads.filter(
      (l) => !l.convertidoEm && l.stage?.nome !== 'CANCELADO',
    ).length;

    const leadsConvertidos = leads.filter((l) => l.convertidoEm !== null);
    const taxaAprovacao =
      leads.length > 0
        ? Math.round((leadsConvertidos.length / leads.length) * 100)
        : 0;

    // Busca créditos aprovados para os leads convertidos desse parceiro
    // Como não há vínculo direto Lead→Credito, usamos valores zerados para comissões
    // até que a tabela de comissões seja implementada
    const comissoesAReceber = 0;
    const comissoesPagasMes = 0;
    const comissoesPagasTotal = 0;

    return {
      comissoesAReceber,
      comissoesPagasMes,
      comissoesPagasTotal,
      operacoesAtivas,
      taxaAprovacao,
      codigoIndicacao: gerarCodigoIndicacao(usuarioId),
    };
  }

  async getOperacoes(usuarioId: string): Promise<OperacaoIndicada[]> {
    const leads = await this.prisma.lead
      .findMany({
        where: { usuarioId, fonte: 'PARCEIRO' },
        include: {
          stage: true,
        },
        orderBy: { criadoEm: 'desc' },
      })
      .catch(() => [] as typeof leads);

    return leads.map((lead) => {
      const valorBase = 0;
      const percentualComissao = PERCENTUAL_COMISSAO_PADRAO;
      const valorComissao = (valorBase * percentualComissao) / 100;

      const comissaoStatus: 'PENDENTE' | 'LIBERADA' | 'PAGA' = 'PENDENTE';

      const stageNome = (lead.stage?.nome ?? lead.statusUltimo ?? '').toUpperCase();
      let status: 'INDICADA' | 'EM_ANALISE' | 'APROVADA' | 'EM_OBRA' | 'CONCLUIDA' | 'RECUSADA';
      if (lead.convertidoEm) {
        status = 'CONCLUIDA';
      } else if (['CANCELADO', 'PERDIDO', 'CANCELADA', 'PERDIDA'].includes(stageNome)) {
        status = 'RECUSADA';
      } else if (stageNome === 'FECHAMENTO') {
        status = 'APROVADA';
      } else if (['PROPOSTA', 'NEGOCIAÇÃO', 'NEGOCIACAO'].includes(stageNome)) {
        status = 'EM_ANALISE';
      } else {
        status = 'INDICADA';
      }

      return {
        id: lead.leadId,
        codigo: `OP-${lead.leadId.slice(0, 8).toUpperCase()}`,
        clienteRef: obfuscarNomeCliente(lead.clienteNome),
        status,
        valorBase,
        percentualComissao,
        valorComissao,
        comissaoStatus,
        validadeIndicacao: calcularValidadeIndicacao(lead.criadoEm),
        criadoEm: lead.criadoEm.toISOString(),
      };
    });
  }

  async getMailing(usuarioId: string): Promise<ContatoMailing[]> {
    const contatos = await this.prisma.mailingContato.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: 'desc' },
    });

    return contatos.map((c) => ({
      id: c.id,
      nome: c.nome,
      email: c.email,
      telefone: c.telefone ?? undefined,
      status: c.status,
      criadoEm: c.criadoEm.toISOString(),
    }));
  }

  async adicionarMailing(
    usuarioId: string,
    data: AdicionarMailingDto,
  ): Promise<ContatoMailing> {
    if (!data.nome?.trim()) {
      throw new BadRequestException('nome é obrigatório');
    }
    if (!data.email?.trim()) {
      throw new BadRequestException('email é obrigatório');
    }

    const contato = await this.prisma.mailingContato.create({
      data: {
        usuarioId,
        nome: data.nome.trim(),
        email: data.email.trim().toLowerCase(),
        telefone: data.telefone?.trim() ?? null,
      },
    });

    return {
      id: contato.id,
      nome: contato.nome,
      email: contato.email,
      telefone: contato.telefone ?? undefined,
      status: contato.status,
      criadoEm: contato.criadoEm.toISOString(),
    };
  }
}
