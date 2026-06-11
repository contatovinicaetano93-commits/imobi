import { z } from "zod";

// ── Enums (espelham os enums Prisma em schema.prisma) ────────────────

export const StatusDossieEnum = z.enum([
  "RASCUNHO",
  "EM_ANALISE",
  "PENDENCIA",
  "APROVADO",
  "REPROVADO",
]);

export const StatusUnidadeDossieEnum = z.enum([
  "VENDIDA",
  "PERMUTA",
  "ESTOQUE",
  "QUITADA",
]);

export const SistemaAmortizacaoEnum = z.enum(["PRICE", "SAC", "SACOC"]);

export const TipoDocumentoDossieEnum = z.enum([
  "DEMONSTRACAO_FINANCEIRA",
  "APRESENTACAO_PROJETO",
  "APRESENTACAO_EMPRESA",
  "ORGANOGRAMA_SOCIETARIO",
  "ACORDO_PERMUTA",
  "CRONOGRAMA_FISICO_FINANCEIRO",
  "OUTRO",
]);

export const TipoEmpreendimentoEnum = z.enum([
  "RESIDENCIAL",
  "COMERCIAL",
  "MISTO",
]);

// Transições válidas do ciclo de vida do dossiê
// RASCUNHO → EM_ANALISE → PENDENCIA → (EM_ANALISE) → APROVADO | REPROVADO
export const DOSSIE_STATUS_TRANSICOES: Record<
  z.infer<typeof StatusDossieEnum>,
  z.infer<typeof StatusDossieEnum>[]
> = {
  RASCUNHO: ["EM_ANALISE"],
  EM_ANALISE: ["PENDENCIA", "APROVADO", "REPROVADO"],
  PENDENCIA: ["EM_ANALISE"],
  APROVADO: [],
  REPROVADO: [],
};

export const DOSSIE_WIZARD_TOTAL_ETAPAS = 7;

// ── Helpers ──────────────────────────────────────────────────────────

const cnpjSchema = z
  .string()
  .regex(/^\d{14}$/, "CNPJ deve conter 14 dígitos numéricos");

const cpfCnpjSchema = z
  .string()
  .regex(/^(\d{11}|\d{14})$/, "CPF/CNPJ deve conter 11 ou 14 dígitos numéricos");

const percentualSchema = z
  .number()
  .min(0, "Percentual não pode ser negativo")
  .max(100, "Percentual não pode ser maior que 100");

const valorMonetarioSchema = z
  .number()
  .nonnegative("Valor não pode ser negativo");

// ── Etapa 1: Ficha do Empreendimento ─────────────────────────────────

export const FichaEmpreendimentoSchema = z.object({
  nomeEmpreendimento: z.string().min(3).max(200),
  speRazaoSocial: z.string().min(3).max(200),
  speCnpj: cnpjSchema,
  endereco: z.string().min(3).max(300),
  cidade: z.string().min(2).max(100),
  uf: z.string().length(2, "UF deve ter 2 letras"),
  tipoEmpreendimento: TipoEmpreendimentoEnum,
  patrimonioAfetacao: z.boolean().default(false),
  areaTerrenoM2: z.number().positive("Área do terreno (m²) deve ser maior que zero"),
  areaConstruidaM2: z.number().positive("Área construída (m²) deve ser maior que zero"),
  areaPrivativaTotalM2: z.number().positive("Área privativa total (m²) deve ser maior que zero"),
  valorTerreno: valorMonetarioSchema,
  dataLancamento: z.string().datetime().optional(),
  dataInicioObras: z.string().datetime().optional(),
  dataPrevisaoTermino: z.string().datetime().optional(),
  dataHabiteSe: z.string().datetime().optional(),
  alienacaoFiduciariaTerreno: z.boolean().default(false),
  alienacaoFiduciariaUnidades: z.boolean().default(false),
  seguroObra: z.boolean().default(false),
  percentualEntrada: percentualSchema,
  percentualObras: percentualSchema,
  percentualChaves: percentualSchema,
  orcamentoOriginal: valorMonetarioSchema,
  orcamentoAtual: valorMonetarioSchema,
  custoIncorrido: valorMonetarioSchema,
  custoAIncorrer: valorMonetarioSchema,
  percentualCronogramaFisico: percentualSchema,
  percentualCronogramaFinanceiro: percentualSchema,
});

export const AtualizarFichaEmpreendimentoSchema =
  FichaEmpreendimentoSchema.partial();

export const CriarDossieSchema = z.object({
  nomeEmpreendimento: z.string().min(3).max(200),
  creditoId: z.string().uuid().optional(),
});

// ── Etapa 2: Tabela de Unidades ──────────────────────────────────────

const UnidadeDossieBaseSchema = z.object({
  numeroContrato: z.string().max(60).optional(),
  numeroUnidade: z.string().min(1, "Nº da unidade é obrigatório").max(30),
  areaPrivativaM2: z
    .number()
    .positive("Área privativa (m²) deve ser maior que zero"),
  clienteNome: z.string().max(200).optional(),
  clienteCpfCnpj: cpfCnpjSchema.optional(),
  dataVenda: z.string().datetime().optional(),
  valorVenda: valorMonetarioSchema.optional(),
  valorTabela: valorMonetarioSchema.optional(),
  status: StatusUnidadeDossieEnum.default("ESTOQUE"),
  indexador: z.string().max(30).optional(),
  taxaJurosMensal: z
    .number()
    .min(0, "Taxa de juros (% a.m.) não pode ser negativa")
    .max(20, "Taxa de juros (% a.m.) não pode ser maior que 20")
    .optional(),
  sistemaAmortizacao: SistemaAmortizacaoEnum.optional(),
});

export const UnidadeDossieSchema = UnidadeDossieBaseSchema.superRefine(
  (u, ctx) => {
    if (u.status === "VENDIDA" || u.status === "QUITADA") {
      if (!u.clienteNome) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["clienteNome"],
          message: "Nome do cliente é obrigatório para unidades vendidas/quitadas",
        });
      }
      if (u.dataVenda == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dataVenda"],
          message: "Data da venda é obrigatória para unidades vendidas/quitadas",
        });
      }
      if (u.valorVenda == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["valorVenda"],
          message: "Valor da venda é obrigatório para unidades vendidas/quitadas",
        });
      }
    }
  }
);

export const AtualizarUnidadeDossieSchema = UnidadeDossieBaseSchema.partial();

// ── Etapa 3: Pergunta sobre permutas ─────────────────────────────────

export const PermutaDossieSchema = z.object({
  // null = não respondido / não se aplica (sem unidades PERMUTA)
  possuiAcordoNaoConcorrenciaPermuta: z.boolean().nullable(),
});

// ── Etapa 4: Carteira de Recebíveis ──────────────────────────────────

const RecebivelDossieBaseSchema = z.object({
  unidadeId: z.string().uuid().optional(),
  numeroContrato: z.string().max(60).optional(),
  numeroUnidade: z.string().min(1, "Nº da unidade é obrigatório").max(30),
  clienteNome: z.string().max(200).optional(),
  parcelaAtual: z
    .number()
    .int("Nº da parcela deve ser um número inteiro")
    .positive("Nº da parcela deve ser maior que zero"),
  totalParcelas: z
    .number()
    .int("Total de parcelas deve ser um número inteiro")
    .positive("Total de parcelas deve ser maior que zero"),
  dataVencimento: z.string().datetime(),
  dataPagamento: z.string().datetime().nullable().optional(),
  valorParcela: z.number().positive("Valor da parcela deve ser maior que zero"),
  valorRecebido: valorMonetarioSchema.nullable().optional(),
});

export const RecebivelDossieSchema = RecebivelDossieBaseSchema.refine(
  (r) => r.parcelaAtual <= r.totalParcelas,
  {
    path: ["parcelaAtual"],
    message: "Nº da parcela não pode ser maior que o total de parcelas",
  }
);

export const AtualizarRecebivelDossieSchema =
  RecebivelDossieBaseSchema.partial();

// ── Etapa 5: Distratos ───────────────────────────────────────────────

const DistratoDossieBaseSchema = z.object({
  unidadeId: z.string().uuid().optional(),
  numeroContrato: z.string().max(60).optional(),
  numeroUnidade: z.string().min(1, "Nº da unidade é obrigatório").max(30),
  clienteNome: z.string().max(200).optional(),
  dataVenda: z.string().datetime().optional(),
  dataDistrato: z.string().datetime(),
  valorRecebido: valorMonetarioSchema.optional(),
  valorRestituido: valorMonetarioSchema.optional(),
  motivo: z.string().max(500).optional(),
});

export const DistratoDossieSchema = DistratoDossieBaseSchema.refine(
  (d) => !d.dataVenda || d.dataVenda <= d.dataDistrato,
  {
    path: ["dataDistrato"],
    message: "Data do distrato não pode ser anterior à data da venda",
  }
);

export const AtualizarDistratoDossieSchema = DistratoDossieBaseSchema.partial();

// ── Etapa 6: Documentos anexos (S3) ──────────────────────────────────

const DocumentoDossieBaseSchema = z.object({
  tipo: TipoDocumentoDossieEnum,
  url: z.string().url("URL do arquivo inválida"),
  nomeArquivo: z.string().max(255).optional(),
  anoExercicio: z
    .number()
    .int("Ano do exercício deve ser um número inteiro")
    .min(1990, "Ano do exercício deve ser a partir de 1990")
    .max(2100, "Ano do exercício inválido")
    .optional(),
  descricao: z.string().max(500).optional(),
});

export const DocumentoDossieSchema = DocumentoDossieBaseSchema.superRefine(
  (d, ctx) => {
    if (d.tipo === "DEMONSTRACAO_FINANCEIRA" && d.anoExercicio == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["anoExercicio"],
        message:
          "Ano do exercício é obrigatório para demonstrações financeiras",
      });
    }
    if (d.tipo === "OUTRO" && !d.descricao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["descricao"],
        message: "Descrição é obrigatória para documentos do tipo OUTRO",
      });
    }
  }
);

export const AtualizarDocumentoDossieSchema =
  DocumentoDossieBaseSchema.partial();

// ── Etapa 7: Empresa desenvolvedora/controladora ─────────────────────

export const EmpresaDesenvolvedoraSchema = z.object({
  empresaNome: z.string().min(2).max(200),
  empresaCnpj: cnpjSchema,
  empresaWebsite: z
    .string()
    .url("Website inválido (use URL completa, ex: https://empresa.com.br)")
    .optional(),
  empresaAnoFundacao: z
    .number()
    .int("Ano de fundação deve ser um número inteiro")
    .min(1800, "Ano de fundação inválido")
    .max(new Date().getFullYear(), "Ano de fundação não pode ser no futuro"),
});

export const AtualizarEmpresaDesenvolvedoraSchema =
  EmpresaDesenvolvedoraSchema.partial();

// ── Wizard / status ──────────────────────────────────────────────────

export const ConcluirEtapaDossieSchema = z.object({
  etapa: z
    .number()
    .int()
    .min(1, "Etapa inválida")
    .max(DOSSIE_WIZARD_TOTAL_ETAPAS, "Etapa inválida"),
});

export const AtualizarStatusDossieSchema = z.object({
  status: StatusDossieEnum,
  observacoes: z.string().max(1000).optional(),
});

// ── Import XLSX/CSV (linhas de planilha) ─────────────────────────────
// Aceitam valores como vêm de planilhas: números em formato BR ("1.234,56"),
// datas DD/MM/AAAA, ISO ou serial Excel, células vazias, etc.

const normalizaTexto = (v: unknown): unknown => {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
};

const normalizaCpfCnpj = (v: unknown): unknown => {
  const s = normalizaTexto(v);
  return typeof s === "string" ? s.replace(/\D/g, "") : s;
};

const normalizaNumero = (v: unknown): unknown => {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    let s = v.trim().replace(/^R\$\s*/i, "").replace(/%$/, "").trim();
    if (s === "") return undefined;
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return Number.isNaN(n) ? v : n;
  }
  return v;
};

const normalizaData = (v: unknown): unknown => {
  if (v == null || v === "") return undefined;
  if (v instanceof Date) return v;
  // Serial de data do Excel (dias desde 30/12/1899)
  if (typeof v === "number") {
    return new Date(Math.round((v - 25569) * 86400 * 1000));
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return undefined;
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return new Date(`${br[3]}-${br[2]}-${br[1]}T00:00:00.000Z`);
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return v;
};

const normalizaEnum = (v: unknown): unknown => {
  const s = normalizaTexto(v);
  return typeof s === "string" ? s.toUpperCase().replace(/\s+/g, "_") : s;
};

const dataImport = (campo: string, obrigatorio = false) =>
  z.preprocess(
    normalizaData,
    obrigatorio
      ? z.date({
          required_error: `${campo} é obrigatório(a)`,
          invalid_type_error: `${campo}: data inválida (use DD/MM/AAAA)`,
        })
      : z
          .date({ invalid_type_error: `${campo}: data inválida (use DD/MM/AAAA)` })
          .optional()
  );

export const ImportUnidadeRowSchema = z
  .object({
    numeroContrato: z.preprocess(normalizaTexto, z.string().max(60).optional()),
    numeroUnidade: z.preprocess(
      normalizaTexto,
      z
        .string({ required_error: "Nº da unidade é obrigatório" })
        .min(1, "Nº da unidade é obrigatório")
        .max(30, "Nº da unidade deve ter no máximo 30 caracteres")
    ),
    areaPrivativaM2: z.preprocess(
      normalizaNumero,
      z
        .number({
          required_error: "Área privativa (m²) é obrigatória",
          invalid_type_error: "Área privativa (m²): número inválido",
        })
        .positive("Área privativa (m²) deve ser maior que zero")
    ),
    clienteNome: z.preprocess(normalizaTexto, z.string().max(200).optional()),
    clienteCpfCnpj: z.preprocess(normalizaCpfCnpj, cpfCnpjSchema.optional()),
    dataVenda: dataImport("Data da venda"),
    valorVenda: z.preprocess(
      normalizaNumero,
      z
        .number({ invalid_type_error: "Valor da venda: número inválido" })
        .nonnegative("Valor da venda não pode ser negativo")
        .optional()
    ),
    valorTabela: z.preprocess(
      normalizaNumero,
      z
        .number({ invalid_type_error: "Valor de tabela: número inválido" })
        .nonnegative("Valor de tabela não pode ser negativo")
        .optional()
    ),
    status: z.preprocess(
      normalizaEnum,
      z.enum(StatusUnidadeDossieEnum.options, {
        errorMap: () => ({
          message:
            "Status inválido (use VENDIDA, PERMUTA, ESTOQUE ou QUITADA)",
        }),
      })
    ),
    indexador: z.preprocess(normalizaTexto, z.string().max(30).optional()),
    taxaJurosMensal: z.preprocess(
      normalizaNumero,
      z
        .number({ invalid_type_error: "Taxa de juros (% a.m.): número inválido" })
        .min(0, "Taxa de juros (% a.m.) não pode ser negativa")
        .max(20, "Taxa de juros (% a.m.) não pode ser maior que 20")
        .optional()
    ),
    sistemaAmortizacao: z.preprocess(
      normalizaEnum,
      z
        .enum(SistemaAmortizacaoEnum.options, {
          errorMap: () => ({
            message:
              "Sistema de amortização inválido (use PRICE, SAC ou SACOC)",
          }),
        })
        .optional()
    ),
  })
  .superRefine((u, ctx) => {
    if (
      (u.status === "VENDIDA" || u.status === "QUITADA") &&
      !u.clienteNome
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clienteNome"],
        message: "Nome do cliente é obrigatório para unidades vendidas/quitadas",
      });
    }
  });

export const ImportRecebivelRowSchema = z
  .object({
    numeroContrato: z.preprocess(normalizaTexto, z.string().max(60).optional()),
    numeroUnidade: z.preprocess(
      normalizaTexto,
      z
        .string({ required_error: "Nº da unidade é obrigatório" })
        .min(1, "Nº da unidade é obrigatório")
        .max(30, "Nº da unidade deve ter no máximo 30 caracteres")
    ),
    clienteNome: z.preprocess(normalizaTexto, z.string().max(200).optional()),
    parcelaAtual: z.preprocess(
      normalizaNumero,
      z
        .number({
          required_error: "Nº da parcela é obrigatório",
          invalid_type_error: "Nº da parcela: número inválido",
        })
        .int("Nº da parcela deve ser um número inteiro")
        .positive("Nº da parcela deve ser maior que zero")
    ),
    totalParcelas: z.preprocess(
      normalizaNumero,
      z
        .number({
          required_error: "Total de parcelas é obrigatório",
          invalid_type_error: "Total de parcelas: número inválido",
        })
        .int("Total de parcelas deve ser um número inteiro")
        .positive("Total de parcelas deve ser maior que zero")
    ),
    dataVencimento: dataImport("Data de vencimento", true),
    dataPagamento: dataImport("Data de pagamento"),
    valorParcela: z.preprocess(
      normalizaNumero,
      z
        .number({
          required_error: "Valor da parcela é obrigatório",
          invalid_type_error: "Valor da parcela: número inválido",
        })
        .positive("Valor da parcela deve ser maior que zero")
    ),
    valorRecebido: z.preprocess(
      normalizaNumero,
      z
        .number({ invalid_type_error: "Valor recebido: número inválido" })
        .nonnegative("Valor recebido não pode ser negativo")
        .optional()
    ),
  })
  .superRefine((r, ctx) => {
    if (r.parcelaAtual > r.totalParcelas) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parcelaAtual"],
        message: "Nº da parcela não pode ser maior que o total de parcelas",
      });
    }
    if (r.dataPagamento && r.valorRecebido == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valorRecebido"],
        message: "Informe o valor recebido quando houver data de pagamento",
      });
    }
  });

// ── Submissão (completude do dossiê) ─────────────────────────────────
// Métricas derivadas (VGV, % vendido, valor recebido/a receber,
// inadimplência) NÃO entram aqui: são calculadas a partir de
// unidades/recebíveis, nunca armazenadas como campos editáveis.

export const DossieSubmitSchema = z
  .object({
    ficha: FichaEmpreendimentoSchema,
    empresa: EmpresaDesenvolvedoraSchema,
    possuiAcordoNaoConcorrenciaPermuta: z.boolean().nullable(),
    unidades: z
      .array(UnidadeDossieSchema)
      .min(1, "Inclua ao menos uma unidade na Tabela de Unidades"),
    recebiveis: z.array(RecebivelDossieSchema).default([]),
    distratos: z.array(DistratoDossieSchema).default([]),
    documentos: z.array(DocumentoDossieSchema).default([]),
    etapasConcluidas: z.array(
      z.number().int().min(1).max(DOSSIE_WIZARD_TOTAL_ETAPAS)
    ),
  })
  .superRefine((d, ctx) => {
    const faltantes: number[] = [];
    for (let etapa = 1; etapa <= DOSSIE_WIZARD_TOTAL_ETAPAS; etapa++) {
      if (!d.etapasConcluidas.includes(etapa)) faltantes.push(etapa);
    }
    if (faltantes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["etapasConcluidas"],
        message: `Conclua todas as etapas antes de submeter (pendentes: ${faltantes.join(", ")})`,
      });
    }

    const temPermuta = d.unidades.some((u) => u.status === "PERMUTA");
    if (temPermuta && d.possuiAcordoNaoConcorrenciaPermuta === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["possuiAcordoNaoConcorrenciaPermuta"],
        message:
          "Informe se existe acordo de não concorrência para as unidades em permuta",
      });
    }
    if (
      temPermuta &&
      d.possuiAcordoNaoConcorrenciaPermuta === true &&
      !d.documentos.some((doc) => doc.tipo === "ACORDO_PERMUTA")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documentos"],
        message: "Anexe o documento do acordo de permuta (ACORDO_PERMUTA)",
      });
    }

    const tiposObrigatorios = [
      "DEMONSTRACAO_FINANCEIRA",
      "CRONOGRAMA_FISICO_FINANCEIRO",
    ] as const;
    for (const tipo of tiposObrigatorios) {
      if (!d.documentos.some((doc) => doc.tipo === tipo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["documentos"],
          message: `Documento obrigatório ausente: ${tipo}`,
        });
      }
    }
  });

// ── Types ────────────────────────────────────────────────────────────

export type StatusDossie = z.infer<typeof StatusDossieEnum>;
export type StatusUnidadeDossie = z.infer<typeof StatusUnidadeDossieEnum>;
export type SistemaAmortizacao = z.infer<typeof SistemaAmortizacaoEnum>;
export type TipoDocumentoDossie = z.infer<typeof TipoDocumentoDossieEnum>;
export type TipoEmpreendimento = z.infer<typeof TipoEmpreendimentoEnum>;
export type FichaEmpreendimentoInput = z.infer<typeof FichaEmpreendimentoSchema>;
export type AtualizarFichaEmpreendimentoInput = z.infer<
  typeof AtualizarFichaEmpreendimentoSchema
>;
export type CriarDossieInput = z.infer<typeof CriarDossieSchema>;
export type UnidadeDossieInput = z.infer<typeof UnidadeDossieSchema>;
export type AtualizarUnidadeDossieInput = z.infer<
  typeof AtualizarUnidadeDossieSchema
>;
export type PermutaDossieInput = z.infer<typeof PermutaDossieSchema>;
export type RecebivelDossieInput = z.infer<typeof RecebivelDossieSchema>;
export type AtualizarRecebivelDossieInput = z.infer<
  typeof AtualizarRecebivelDossieSchema
>;
export type DistratoDossieInput = z.infer<typeof DistratoDossieSchema>;
export type AtualizarDistratoDossieInput = z.infer<
  typeof AtualizarDistratoDossieSchema
>;
export type DocumentoDossieInput = z.infer<typeof DocumentoDossieSchema>;
export type AtualizarDocumentoDossieInput = z.infer<
  typeof AtualizarDocumentoDossieSchema
>;
export type EmpresaDesenvolvedoraInput = z.infer<
  typeof EmpresaDesenvolvedoraSchema
>;
export type AtualizarEmpresaDesenvolvedoraInput = z.infer<
  typeof AtualizarEmpresaDesenvolvedoraSchema
>;
export type ConcluirEtapaDossieInput = z.infer<typeof ConcluirEtapaDossieSchema>;
export type AtualizarStatusDossieInput = z.infer<
  typeof AtualizarStatusDossieSchema
>;
export type ImportUnidadeRowInput = z.infer<typeof ImportUnidadeRowSchema>;
export type ImportRecebivelRowInput = z.infer<typeof ImportRecebivelRowSchema>;
export type DossieSubmitInput = z.infer<typeof DossieSubmitSchema>;
