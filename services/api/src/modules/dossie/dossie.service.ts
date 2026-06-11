import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  ConcluirEtapaDossieSchema,
  DossieSubmitSchema,
  DOSSIE_STATUS_TRANSICOES,
  ImportRecebivelRowSchema,
  ImportUnidadeRowSchema,
} from "@imbobi/schemas";
import type {
  AtualizarFichaEmpreendimentoInput,
  AtualizarStatusDossieInput,
  CriarDossieInput,
  DistratoDossieInput,
  DocumentoDossieInput,
  EmpresaDesenvolvedoraInput,
  ImportUnidadeRowInput,
  PermutaDossieInput,
  RecebivelDossieInput,
  StatusDossie,
  UnidadeDossieInput,
} from "@imbobi/schemas";
import type { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import type { ZodType, ZodTypeDef } from "zod";

// Perfis que analisam dossiês (leitura de todos + mudança de status),
// espelhando manager.service / evidencias.service.
const PERFIS_ANALISTA = ["GESTOR_OBRA", "ADMIN"];

// Edição só é permitida nestes status (RASCUNHO inicial ou correção de PENDENCIA)
const STATUS_EDITAVEIS: StatusDossie[] = ["RASCUNHO", "PENDENCIA"];

export interface ImportResultado {
  importadas: number;
  erros: { linha: number; mensagens: string[] }[];
}

@Injectable()
export class DossieService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers de acesso ──────────────────────────────────────────────

  private ehAnalista(usuario: UsuarioAtual) {
    return PERFIS_ANALISTA.includes(usuario.tipo);
  }

  private async obterOuFalhar(dossieId: string) {
    const dossie = await this.prisma.dossieCredito.findUnique({
      where: { dossieId },
    });
    if (!dossie) throw new NotFoundException("Dossiê não encontrado.");
    return dossie;
  }

  /** Leitura: dono ou analista (GESTOR_OBRA/ADMIN). */
  private async obterParaLeitura(dossieId: string, usuario: UsuarioAtual) {
    const dossie = await this.obterOuFalhar(dossieId);
    if (dossie.usuarioId !== usuario.id && !this.ehAnalista(usuario)) {
      throw new ForbiddenException("Acesso negado.");
    }
    return dossie;
  }

  /** Edição: apenas o dono, e apenas em RASCUNHO ou PENDENCIA. */
  private async obterParaEdicao(dossieId: string, usuario: UsuarioAtual) {
    const dossie = await this.obterOuFalhar(dossieId);
    if (dossie.usuarioId !== usuario.id) {
      throw new ForbiddenException("Apenas o dono do dossiê pode editá-lo.");
    }
    if (!STATUS_EDITAVEIS.includes(dossie.status as StatusDossie)) {
      throw new ConflictException(
        `Dossiê em status ${dossie.status} não pode ser editado (apenas RASCUNHO ou PENDENCIA).`
      );
    }
    return dossie;
  }

  // ── CRUD básico ────────────────────────────────────────────────────

  async criar(usuarioId: string, input: CriarDossieInput) {
    return this.prisma.dossieCredito.create({
      data: {
        usuarioId,
        nomeEmpreendimento: input.nomeEmpreendimento,
        creditoId: input.creditoId,
      },
    });
  }

  async listar(usuario: UsuarioAtual) {
    return this.prisma.dossieCredito.findMany({
      where: this.ehAnalista(usuario) ? {} : { usuarioId: usuario.id },
      include: {
        usuario: { select: { nome: true, email: true } },
        _count: {
          select: {
            unidades: true,
            recebiveis: true,
            distratos: true,
            documentos: true,
          },
        },
      },
      orderBy: { criadoEm: "desc" },
    });
  }

  async obterCompleto(dossieId: string, usuario: UsuarioAtual) {
    await this.obterParaLeitura(dossieId, usuario);
    const dossie = await this.prisma.dossieCredito.findUnique({
      where: { dossieId },
      include: {
        usuario: { select: { nome: true, email: true } },
        unidades: { orderBy: { numeroUnidade: "asc" } },
        recebiveis: { orderBy: { dataVencimento: "asc" } },
        distratos: { orderBy: { dataDistrato: "desc" } },
        documentos: { orderBy: { criadoEm: "desc" } },
      },
    });
    return {
      ...dossie,
      metricas: this.calcularMetricas(dossie.unidades, dossie.recebiveis),
    };
  }

  // ── Etapa 1: Ficha do Empreendimento ───────────────────────────────

  async atualizarFicha(
    dossieId: string,
    usuario: UsuarioAtual,
    input: AtualizarFichaEmpreendimentoInput
  ) {
    await this.obterParaEdicao(dossieId, usuario);
    return this.prisma.dossieCredito.update({
      where: { dossieId },
      data: input,
    });
  }

  // ── Etapa 2: Unidades ──────────────────────────────────────────────

  async substituirUnidades(
    dossieId: string,
    usuario: UsuarioAtual,
    unidades: UnidadeDossieInput[]
  ) {
    await this.obterParaEdicao(dossieId, usuario);
    const duplicadas = this.numerosDuplicados(unidades.map((u) => u.numeroUnidade));
    if (duplicadas.length > 0) {
      throw new BadRequestException(
        `Nº de unidade duplicado: ${duplicadas.join(", ")}`
      );
    }
    await this.prisma.$transaction([
      this.prisma.dossieUnidade.deleteMany({ where: { dossieId } }),
      this.prisma.dossieUnidade.createMany({
        data: unidades.map((u) => this.paraUnidadeCreate(dossieId, u)),
      }),
    ]);
    return this.prisma.dossieUnidade.findMany({
      where: { dossieId },
      orderBy: { numeroUnidade: "asc" },
    });
  }

  async importarUnidades(
    dossieId: string,
    usuario: UsuarioAtual,
    linhas: unknown
  ): Promise<ImportResultado> {
    await this.obterParaEdicao(dossieId, usuario);
    const { validas, erros } = this.validarLinhas(ImportUnidadeRowSchema, linhas);

    // Duplicidade entre linhas (a constraint @@unique[dossieId, numeroUnidade] exige unicidade)
    const vistos = new Map<string, number>();
    (linhas as unknown[]).forEach((_, i) => {
      const u = validas.get(i);
      if (!u) return;
      const anterior = vistos.get(u.numeroUnidade);
      if (anterior !== undefined) {
        erros.push({
          linha: i + 1,
          mensagens: [
            `numeroUnidade: unidade "${u.numeroUnidade}" duplicada (também na linha ${anterior + 1})`,
          ],
        });
      } else {
        vistos.set(u.numeroUnidade, i);
      }
    });

    if (erros.length > 0) {
      return { importadas: 0, erros: this.ordenarErros(erros) };
    }

    const unidades = Array.from(validas.values());
    await this.prisma.$transaction([
      this.prisma.dossieUnidade.deleteMany({ where: { dossieId } }),
      this.prisma.dossieUnidade.createMany({
        data: unidades.map((u) => this.paraUnidadeCreate(dossieId, u)),
      }),
    ]);
    return { importadas: unidades.length, erros: [] };
  }

  // ── Etapa 3: Permutas ──────────────────────────────────────────────

  async atualizarPermuta(
    dossieId: string,
    usuario: UsuarioAtual,
    input: PermutaDossieInput
  ) {
    await this.obterParaEdicao(dossieId, usuario);
    return this.prisma.dossieCredito.update({
      where: { dossieId },
      data: {
        possuiAcordoNaoConcorrenciaPermuta: input.possuiAcordoNaoConcorrenciaPermuta,
      },
    });
  }

  // ── Etapa 4: Recebíveis ────────────────────────────────────────────

  async substituirRecebiveis(
    dossieId: string,
    usuario: UsuarioAtual,
    recebiveis: RecebivelDossieInput[]
  ) {
    await this.obterParaEdicao(dossieId, usuario);
    const mapa = await this.mapaUnidades(dossieId);
    await this.prisma.$transaction([
      this.prisma.dossieRecebivel.deleteMany({ where: { dossieId } }),
      this.prisma.dossieRecebivel.createMany({
        data: recebiveis.map((r) => ({
          dossieId,
          unidadeId: mapa.get(r.numeroUnidade) ?? null,
          numeroContrato: r.numeroContrato,
          numeroUnidade: r.numeroUnidade,
          clienteNome: r.clienteNome,
          parcelaAtual: r.parcelaAtual,
          totalParcelas: r.totalParcelas,
          dataVencimento: r.dataVencimento,
          dataPagamento: r.dataPagamento ?? null,
          valorParcela: r.valorParcela,
          valorRecebido: r.valorRecebido ?? null,
        })),
      }),
    ]);
    return this.prisma.dossieRecebivel.findMany({
      where: { dossieId },
      orderBy: { dataVencimento: "asc" },
    });
  }

  async importarRecebiveis(
    dossieId: string,
    usuario: UsuarioAtual,
    linhas: unknown
  ): Promise<ImportResultado> {
    await this.obterParaEdicao(dossieId, usuario);
    const { validas, erros } = this.validarLinhas(ImportRecebivelRowSchema, linhas);
    if (erros.length > 0) {
      return { importadas: 0, erros: this.ordenarErros(erros) };
    }

    const mapa = await this.mapaUnidades(dossieId);
    const recebiveis = Array.from(validas.values());
    await this.prisma.$transaction([
      this.prisma.dossieRecebivel.deleteMany({ where: { dossieId } }),
      this.prisma.dossieRecebivel.createMany({
        data: recebiveis.map((r) => ({
          dossieId,
          unidadeId: mapa.get(r.numeroUnidade) ?? null,
          numeroContrato: r.numeroContrato,
          numeroUnidade: r.numeroUnidade,
          clienteNome: r.clienteNome,
          parcelaAtual: r.parcelaAtual,
          totalParcelas: r.totalParcelas,
          dataVencimento: r.dataVencimento,
          dataPagamento: r.dataPagamento ?? null,
          valorParcela: r.valorParcela,
          valorRecebido: r.valorRecebido ?? null,
        })),
      }),
    ]);
    return { importadas: recebiveis.length, erros: [] };
  }

  // ── Etapa 6 (opcional): Distratos ──────────────────────────────────

  async substituirDistratos(
    dossieId: string,
    usuario: UsuarioAtual,
    distratos: DistratoDossieInput[]
  ) {
    await this.obterParaEdicao(dossieId, usuario);
    const mapa = await this.mapaUnidades(dossieId);
    await this.prisma.$transaction([
      this.prisma.dossieDistrato.deleteMany({ where: { dossieId } }),
      this.prisma.dossieDistrato.createMany({
        data: distratos.map((d) => ({
          dossieId,
          unidadeId: mapa.get(d.numeroUnidade) ?? null,
          numeroContrato: d.numeroContrato,
          numeroUnidade: d.numeroUnidade,
          clienteNome: d.clienteNome,
          dataVenda: d.dataVenda,
          dataDistrato: d.dataDistrato,
          valorRecebido: d.valorRecebido,
          valorRestituido: d.valorRestituido,
          motivo: d.motivo,
        })),
      }),
    ]);
    return this.prisma.dossieDistrato.findMany({
      where: { dossieId },
      orderBy: { dataDistrato: "desc" },
    });
  }

  // ── Etapa 6: Documentos (metadados de upload S3, padrão kyc) ───────

  async registrarDocumento(
    dossieId: string,
    usuario: UsuarioAtual,
    input: DocumentoDossieInput
  ) {
    await this.obterParaEdicao(dossieId, usuario);
    return this.prisma.dossieDocumento.create({
      data: {
        dossieId,
        tipo: input.tipo,
        url: input.url,
        nomeArquivo: input.nomeArquivo,
        anoExercicio: input.anoExercicio,
        descricao: input.descricao,
      },
    });
  }

  async removerDocumento(
    dossieId: string,
    usuario: UsuarioAtual,
    dossieDocumentoId: string
  ) {
    await this.obterParaEdicao(dossieId, usuario);
    const documento = await this.prisma.dossieDocumento.findUnique({
      where: { dossieDocumentoId },
    });
    if (!documento || documento.dossieId !== dossieId) {
      throw new NotFoundException("Documento não encontrado.");
    }
    await this.prisma.dossieDocumento.delete({ where: { dossieDocumentoId } });
    return { removido: true, dossieDocumentoId };
  }

  // ── Etapa 6: Empresa desenvolvedora ────────────────────────────────

  async atualizarEmpresa(
    dossieId: string,
    usuario: UsuarioAtual,
    input: EmpresaDesenvolvedoraInput
  ) {
    await this.obterParaEdicao(dossieId, usuario);
    return this.prisma.dossieCredito.update({
      where: { dossieId },
      data: input,
    });
  }

  // ── Wizard: concluir etapa ─────────────────────────────────────────

  async concluirEtapa(dossieId: string, usuario: UsuarioAtual, numero: number) {
    const parsed = ConcluirEtapaDossieSchema.safeParse({ etapa: numero });
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
      );
    }
    const dossie = await this.obterParaEdicao(dossieId, usuario);
    const { etapa } = parsed.data;
    if (dossie.etapasConcluidas.includes(etapa)) return dossie;

    const etapasConcluidas = [...dossie.etapasConcluidas, etapa].sort(
      (a, b) => a - b
    );
    const [atualizado] = await this.prisma.$transaction([
      this.prisma.dossieCredito.update({
        where: { dossieId },
        data: { etapasConcluidas },
      }),
      this.prisma.dossieAuditLog.create({
        data: {
          dossieId,
          acaoTipo: "ETAPA_CONCLUIDA",
          usuarioId: usuario.id,
          observacoes: `Etapa ${etapa} concluída`,
        },
      }),
    ]);
    return atualizado;
  }

  // ── Submissão ──────────────────────────────────────────────────────

  async submeter(dossieId: string, usuario: UsuarioAtual) {
    const dossie = await this.prisma.dossieCredito.findUnique({
      where: { dossieId },
      include: {
        unidades: true,
        recebiveis: true,
        distratos: true,
        documentos: true,
      },
    });
    if (!dossie) throw new NotFoundException("Dossiê não encontrado.");
    if (dossie.usuarioId !== usuario.id) {
      throw new ForbiddenException("Apenas o dono do dossiê pode submetê-lo.");
    }
    const transicoes = DOSSIE_STATUS_TRANSICOES[dossie.status as StatusDossie] ?? [];
    if (!transicoes.includes("EM_ANALISE")) {
      throw new ConflictException(
        `Dossiê em status ${dossie.status} não pode ser submetido.`
      );
    }

    const agregado = this.montarAgregadoSubmit(dossie);
    const resultado = DossieSubmitSchema.safeParse(agregado);
    if (!resultado.success) {
      throw new BadRequestException(
        resultado.error.errors.map((e) =>
          e.path.length ? `${e.path.join(".")}: ${e.message}` : e.message
        )
      );
    }

    const [atualizado] = await this.prisma.$transaction([
      this.prisma.dossieCredito.update({
        where: { dossieId },
        data: { status: "EM_ANALISE", submetidoEm: new Date() },
      }),
      this.prisma.dossieAuditLog.create({
        data: {
          dossieId,
          acaoTipo: "SUBMETIDO",
          statusAnterior: dossie.status,
          statusNovo: "EM_ANALISE",
          usuarioId: usuario.id,
        },
      }),
    ]);
    return atualizado;
  }

  // ── Status (analista) ──────────────────────────────────────────────

  async atualizarStatus(
    dossieId: string,
    usuario: UsuarioAtual,
    input: AtualizarStatusDossieInput
  ) {
    if (!this.ehAnalista(usuario)) {
      throw new ForbiddenException(
        "Apenas analistas podem alterar o status do dossiê."
      );
    }
    const dossie = await this.obterOuFalhar(dossieId);
    const transicoes = DOSSIE_STATUS_TRANSICOES[dossie.status as StatusDossie] ?? [];
    if (!transicoes.includes(input.status)) {
      throw new ConflictException(
        `Transição de status inválida: ${dossie.status} → ${input.status}.`
      );
    }

    const [atualizado] = await this.prisma.$transaction([
      this.prisma.dossieCredito.update({
        where: { dossieId },
        data: {
          status: input.status,
          analisadoPor: usuario.id,
          analisadoEm: new Date(),
        },
      }),
      this.prisma.dossieAuditLog.create({
        data: {
          dossieId,
          acaoTipo: "STATUS_ALTERADO",
          statusAnterior: dossie.status,
          statusNovo: input.status,
          usuarioId: usuario.id,
          observacoes: input.observacoes,
        },
      }),
    ]);
    return atualizado;
  }

  // ── Métricas derivadas (calculadas, nunca armazenadas) ─────────────

  async metricas(dossieId: string, usuario: UsuarioAtual) {
    await this.obterParaLeitura(dossieId, usuario);
    const [unidades, recebiveis] = await Promise.all([
      this.prisma.dossieUnidade.findMany({ where: { dossieId } }),
      this.prisma.dossieRecebivel.findMany({ where: { dossieId } }),
    ]);
    return this.calcularMetricas(unidades, recebiveis);
  }

  private calcularMetricas(
    unidades: {
      status: string;
      valorVenda: number | null;
      valorTabela: number | null;
    }[],
    recebiveis: {
      dataVencimento: Date;
      dataPagamento: Date | null;
      valorParcela: number;
      valorRecebido: number | null;
    }[]
  ) {
    const agora = new Date();
    const arred2 = (n: number) => Math.round(n * 100) / 100;
    const valorReferencia = (u: { valorVenda: number | null; valorTabela: number | null }) =>
      u.valorVenda ?? u.valorTabela ?? 0;

    const unidadesPorStatus = {
      VENDIDA: 0,
      PERMUTA: 0,
      ESTOQUE: 0,
      QUITADA: 0,
    } as Record<string, number>;
    let vgv = 0;
    let valorEstoque = 0;
    let valorPermutado = 0;
    for (const u of unidades) {
      unidadesPorStatus[u.status] = (unidadesPorStatus[u.status] ?? 0) + 1;
      vgv += u.valorVenda ?? 0;
      if (u.status === "ESTOQUE") valorEstoque += valorReferencia(u);
      if (u.status === "PERMUTA") valorPermutado += valorReferencia(u);
    }

    const totalUnidades = unidades.length;
    const baseVendaveis = totalUnidades - unidadesPorStatus["PERMUTA"];
    const vendidas = unidadesPorStatus["VENDIDA"] + unidadesPorStatus["QUITADA"];
    const percentualVendido =
      baseVendaveis > 0 ? arred2((vendidas / baseVendaveis) * 100) : 0;

    let valorRecebido = 0;
    let valorAReceber = 0;
    let valorCarteira = 0;
    let parcelasVencidas = 0;
    let valorVencido = 0;
    let somaDiasAtraso = 0;
    for (const r of recebiveis) {
      valorCarteira += r.valorParcela;
      if (r.dataPagamento) {
        valorRecebido += r.valorRecebido ?? r.valorParcela;
      } else {
        valorAReceber += r.valorParcela;
        if (r.dataVencimento < agora) {
          parcelasVencidas += 1;
          valorVencido += r.valorParcela;
          somaDiasAtraso += Math.floor(
            (agora.getTime() - r.dataVencimento.getTime()) / 86_400_000
          );
        }
      }
    }

    return {
      vgv: arred2(vgv),
      valorRecebido: arred2(valorRecebido),
      valorAReceber: arred2(valorAReceber),
      valorEstoque: arred2(valorEstoque),
      valorPermutado: arred2(valorPermutado),
      percentualVendido,
      totalUnidades,
      unidadesPorStatus,
      inadimplencia: {
        parcelasVencidas,
        valorVencido: arred2(valorVencido),
        percentualCarteira:
          valorCarteira > 0 ? arred2((valorVencido / valorCarteira) * 100) : 0,
      },
      atrasoMedioDias:
        parcelasVencidas > 0 ? arred2(somaDiasAtraso / parcelasVencidas) : 0,
    };
  }

  // ── Helpers internos ───────────────────────────────────────────────

  /** Mapeia entrada validada (form ou import) para o create da DossieUnidade. */
  private paraUnidadeCreate(
    dossieId: string,
    u: UnidadeDossieInput | ImportUnidadeRowInput
  ) {
    return {
      dossieId,
      numeroContrato: u.numeroContrato,
      numeroUnidade: u.numeroUnidade,
      areaPrivativaM2: u.areaPrivativaM2,
      clienteNome: u.clienteNome,
      clienteCpfCnpj: u.clienteCpfCnpj,
      dataVenda: u.dataVenda,
      valorVenda: u.valorVenda,
      valorTabela: u.valorTabela,
      status: u.status,
      indexador: u.indexador,
      taxaJurosMensal: u.taxaJurosMensal,
      sistemaAmortizacao: u.sistemaAmortizacao,
    };
  }

  private numerosDuplicados(numeros: string[]) {
    const vistos = new Set<string>();
    const duplicados = new Set<string>();
    for (const n of numeros) {
      if (vistos.has(n)) duplicados.add(n);
      vistos.add(n);
    }
    return Array.from(duplicados);
  }

  private async mapaUnidades(dossieId: string) {
    const unidades = await this.prisma.dossieUnidade.findMany({
      where: { dossieId },
      select: { unidadeId: true, numeroUnidade: true },
    });
    return new Map(unidades.map((u) => [u.numeroUnidade, u.unidadeId]));
  }

  /** Valida linha a linha (Zod = fonte de verdade); linha é 1-based. */
  private validarLinhas<T>(
    schema: ZodType<T, ZodTypeDef, unknown>,
    linhas: unknown
  ) {
    if (!Array.isArray(linhas)) {
      throw new BadRequestException(
        "Corpo da requisição deve ser um array de linhas da planilha."
      );
    }
    const validas = new Map<number, T>();
    const erros: { linha: number; mensagens: string[] }[] = [];
    linhas.forEach((linha, i) => {
      const resultado = schema.safeParse(linha);
      if (resultado.success) {
        validas.set(i, resultado.data);
      } else {
        erros.push({
          linha: i + 1,
          mensagens: resultado.error.errors.map((e) =>
            e.path.length ? `${e.path.join(".")}: ${e.message}` : e.message
          ),
        });
      }
    });
    return { validas, erros };
  }

  private ordenarErros(erros: { linha: number; mensagens: string[] }[]) {
    return [...erros].sort((a, b) => a.linha - b.linha);
  }

  /** Monta o agregado no formato esperado pelo DossieSubmitSchema. */
  private montarAgregadoSubmit(dossie: any) {
    const def = <T>(v: T | null): T | undefined => v ?? undefined;
    const iso = (d: Date | null) => (d ? d.toISOString() : undefined);

    return {
      ficha: {
        nomeEmpreendimento: dossie.nomeEmpreendimento,
        speRazaoSocial: def(dossie.speRazaoSocial),
        speCnpj: def(dossie.speCnpj),
        endereco: def(dossie.endereco),
        cidade: def(dossie.cidade),
        uf: def(dossie.uf),
        tipoEmpreendimento: def(dossie.tipoEmpreendimento),
        patrimonioAfetacao: dossie.patrimonioAfetacao,
        areaTerrenoM2: def(dossie.areaTerrenoM2),
        areaConstruidaM2: def(dossie.areaConstruidaM2),
        areaPrivativaTotalM2: def(dossie.areaPrivativaTotalM2),
        valorTerreno: def(dossie.valorTerreno),
        dataLancamento: iso(dossie.dataLancamento),
        dataInicioObras: iso(dossie.dataInicioObras),
        dataPrevisaoTermino: iso(dossie.dataPrevisaoTermino),
        dataHabiteSe: iso(dossie.dataHabiteSe),
        alienacaoFiduciariaTerreno: dossie.alienacaoFiduciariaTerreno,
        alienacaoFiduciariaUnidades: dossie.alienacaoFiduciariaUnidades,
        seguroObra: dossie.seguroObra,
        percentualEntrada: def(dossie.percentualEntrada),
        percentualObras: def(dossie.percentualObras),
        percentualChaves: def(dossie.percentualChaves),
        orcamentoOriginal: def(dossie.orcamentoOriginal),
        orcamentoAtual: def(dossie.orcamentoAtual),
        custoIncorrido: def(dossie.custoIncorrido),
        custoAIncorrer: def(dossie.custoAIncorrer),
        percentualCronogramaFisico: def(dossie.percentualCronogramaFisico),
        percentualCronogramaFinanceiro: def(dossie.percentualCronogramaFinanceiro),
      },
      empresa: {
        empresaNome: def(dossie.empresaNome),
        empresaCnpj: def(dossie.empresaCnpj),
        empresaWebsite: def(dossie.empresaWebsite),
        empresaAnoFundacao: def(dossie.empresaAnoFundacao),
      },
      possuiAcordoNaoConcorrenciaPermuta: dossie.possuiAcordoNaoConcorrenciaPermuta,
      unidades: dossie.unidades.map((u: any) => ({
        numeroContrato: def(u.numeroContrato),
        numeroUnidade: u.numeroUnidade,
        areaPrivativaM2: u.areaPrivativaM2,
        clienteNome: def(u.clienteNome),
        clienteCpfCnpj: def(u.clienteCpfCnpj),
        dataVenda: iso(u.dataVenda),
        valorVenda: def(u.valorVenda),
        valorTabela: def(u.valorTabela),
        status: u.status,
        indexador: def(u.indexador),
        taxaJurosMensal: def(u.taxaJurosMensal),
        sistemaAmortizacao: def(u.sistemaAmortizacao),
      })),
      recebiveis: dossie.recebiveis.map((r: any) => ({
        unidadeId: def(r.unidadeId),
        numeroContrato: def(r.numeroContrato),
        numeroUnidade: r.numeroUnidade,
        clienteNome: def(r.clienteNome),
        parcelaAtual: r.parcelaAtual,
        totalParcelas: r.totalParcelas,
        dataVencimento: r.dataVencimento.toISOString(),
        dataPagamento: r.dataPagamento ? r.dataPagamento.toISOString() : null,
        valorParcela: r.valorParcela,
        valorRecebido: r.valorRecebido,
      })),
      distratos: dossie.distratos.map((d: any) => ({
        unidadeId: def(d.unidadeId),
        numeroContrato: def(d.numeroContrato),
        numeroUnidade: d.numeroUnidade,
        clienteNome: def(d.clienteNome),
        dataVenda: iso(d.dataVenda),
        dataDistrato: d.dataDistrato.toISOString(),
        valorRecebido: def(d.valorRecebido),
        valorRestituido: def(d.valorRestituido),
        motivo: def(d.motivo),
      })),
      documentos: dossie.documentos.map((doc: any) => ({
        tipo: doc.tipo,
        url: doc.url,
        nomeArquivo: def(doc.nomeArquivo),
        anoExercicio: def(doc.anoExercicio),
        descricao: def(doc.descricao),
      })),
      etapasConcluidas: dossie.etapasConcluidas,
    };
  }
}
