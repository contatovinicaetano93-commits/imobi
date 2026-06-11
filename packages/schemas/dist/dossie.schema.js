"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DossieSubmitSchema = exports.ImportRecebivelRowSchema = exports.ImportUnidadeRowSchema = exports.AtualizarStatusDossieSchema = exports.ConcluirEtapaDossieSchema = exports.AtualizarEmpresaDesenvolvedoraSchema = exports.EmpresaDesenvolvedoraSchema = exports.AtualizarDocumentoDossieSchema = exports.DocumentoDossieSchema = exports.AtualizarDistratoDossieSchema = exports.DistratoDossieSchema = exports.AtualizarRecebivelDossieSchema = exports.RecebivelDossieSchema = exports.PermutaDossieSchema = exports.AtualizarUnidadeDossieSchema = exports.UnidadeDossieSchema = exports.CriarDossieSchema = exports.AtualizarFichaEmpreendimentoSchema = exports.FichaEmpreendimentoSchema = exports.DOSSIE_WIZARD_TOTAL_ETAPAS = exports.DOSSIE_STATUS_TRANSICOES = exports.TipoEmpreendimentoEnum = exports.TipoDocumentoDossieEnum = exports.SistemaAmortizacaoEnum = exports.StatusUnidadeDossieEnum = exports.StatusDossieEnum = void 0;
const zod_1 = require("zod");
// ── Enums (espelham os enums Prisma em schema.prisma) ────────────────
exports.StatusDossieEnum = zod_1.z.enum([
    "RASCUNHO",
    "EM_ANALISE",
    "PENDENCIA",
    "APROVADO",
    "REPROVADO",
]);
exports.StatusUnidadeDossieEnum = zod_1.z.enum([
    "VENDIDA",
    "PERMUTA",
    "ESTOQUE",
    "QUITADA",
]);
exports.SistemaAmortizacaoEnum = zod_1.z.enum(["PRICE", "SAC", "SACOC"]);
exports.TipoDocumentoDossieEnum = zod_1.z.enum([
    "DEMONSTRACAO_FINANCEIRA",
    "APRESENTACAO_PROJETO",
    "APRESENTACAO_EMPRESA",
    "ORGANOGRAMA_SOCIETARIO",
    "ACORDO_PERMUTA",
    "CRONOGRAMA_FISICO_FINANCEIRO",
    "OUTRO",
]);
exports.TipoEmpreendimentoEnum = zod_1.z.enum([
    "RESIDENCIAL",
    "COMERCIAL",
    "MISTO",
]);
// Transições válidas do ciclo de vida do dossiê
// RASCUNHO → EM_ANALISE → PENDENCIA → (EM_ANALISE) → APROVADO | REPROVADO
exports.DOSSIE_STATUS_TRANSICOES = {
    RASCUNHO: ["EM_ANALISE"],
    EM_ANALISE: ["PENDENCIA", "APROVADO", "REPROVADO"],
    PENDENCIA: ["EM_ANALISE"],
    APROVADO: [],
    REPROVADO: [],
};
exports.DOSSIE_WIZARD_TOTAL_ETAPAS = 7;
// ── Helpers ──────────────────────────────────────────────────────────
const cnpjSchema = zod_1.z
    .string()
    .regex(/^\d{14}$/, "CNPJ deve conter 14 dígitos numéricos");
const cpfCnpjSchema = zod_1.z
    .string()
    .regex(/^(\d{11}|\d{14})$/, "CPF/CNPJ deve conter 11 ou 14 dígitos numéricos");
const percentualSchema = zod_1.z
    .number()
    .min(0, "Percentual não pode ser negativo")
    .max(100, "Percentual não pode ser maior que 100");
const valorMonetarioSchema = zod_1.z
    .number()
    .nonnegative("Valor não pode ser negativo");
// ── Etapa 1: Ficha do Empreendimento ─────────────────────────────────
exports.FichaEmpreendimentoSchema = zod_1.z.object({
    nomeEmpreendimento: zod_1.z.string().min(3).max(200),
    speRazaoSocial: zod_1.z.string().min(3).max(200),
    speCnpj: cnpjSchema,
    endereco: zod_1.z.string().min(3).max(300),
    cidade: zod_1.z.string().min(2).max(100),
    uf: zod_1.z.string().length(2, "UF deve ter 2 letras"),
    tipoEmpreendimento: exports.TipoEmpreendimentoEnum,
    patrimonioAfetacao: zod_1.z.boolean().default(false),
    areaTerrenoM2: zod_1.z.number().positive("Área do terreno (m²) deve ser maior que zero"),
    areaConstruidaM2: zod_1.z.number().positive("Área construída (m²) deve ser maior que zero"),
    areaPrivativaTotalM2: zod_1.z.number().positive("Área privativa total (m²) deve ser maior que zero"),
    valorTerreno: valorMonetarioSchema,
    dataLancamento: zod_1.z.string().datetime().optional(),
    dataInicioObras: zod_1.z.string().datetime().optional(),
    dataPrevisaoTermino: zod_1.z.string().datetime().optional(),
    dataHabiteSe: zod_1.z.string().datetime().optional(),
    alienacaoFiduciariaTerreno: zod_1.z.boolean().default(false),
    alienacaoFiduciariaUnidades: zod_1.z.boolean().default(false),
    seguroObra: zod_1.z.boolean().default(false),
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
exports.AtualizarFichaEmpreendimentoSchema = exports.FichaEmpreendimentoSchema.partial();
exports.CriarDossieSchema = zod_1.z.object({
    nomeEmpreendimento: zod_1.z.string().min(3).max(200),
    creditoId: zod_1.z.string().uuid().optional(),
});
// ── Etapa 2: Tabela de Unidades ──────────────────────────────────────
const UnidadeDossieBaseSchema = zod_1.z.object({
    numeroContrato: zod_1.z.string().max(60).optional(),
    numeroUnidade: zod_1.z.string().min(1, "Nº da unidade é obrigatório").max(30),
    areaPrivativaM2: zod_1.z
        .number()
        .positive("Área privativa (m²) deve ser maior que zero"),
    clienteNome: zod_1.z.string().max(200).optional(),
    clienteCpfCnpj: cpfCnpjSchema.optional(),
    dataVenda: zod_1.z.string().datetime().optional(),
    valorVenda: valorMonetarioSchema.optional(),
    valorTabela: valorMonetarioSchema.optional(),
    status: exports.StatusUnidadeDossieEnum.default("ESTOQUE"),
    indexador: zod_1.z.string().max(30).optional(),
    taxaJurosMensal: zod_1.z
        .number()
        .min(0, "Taxa de juros (% a.m.) não pode ser negativa")
        .max(20, "Taxa de juros (% a.m.) não pode ser maior que 20")
        .optional(),
    sistemaAmortizacao: exports.SistemaAmortizacaoEnum.optional(),
});
exports.UnidadeDossieSchema = UnidadeDossieBaseSchema.superRefine((u, ctx) => {
    if (u.status === "VENDIDA" || u.status === "QUITADA") {
        if (!u.clienteNome) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["clienteNome"],
                message: "Nome do cliente é obrigatório para unidades vendidas/quitadas",
            });
        }
        if (u.dataVenda == null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["dataVenda"],
                message: "Data da venda é obrigatória para unidades vendidas/quitadas",
            });
        }
        if (u.valorVenda == null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["valorVenda"],
                message: "Valor da venda é obrigatório para unidades vendidas/quitadas",
            });
        }
    }
});
exports.AtualizarUnidadeDossieSchema = UnidadeDossieBaseSchema.partial();
// ── Etapa 3: Pergunta sobre permutas ─────────────────────────────────
exports.PermutaDossieSchema = zod_1.z.object({
    // null = não respondido / não se aplica (sem unidades PERMUTA)
    possuiAcordoNaoConcorrenciaPermuta: zod_1.z.boolean().nullable(),
});
// ── Etapa 4: Carteira de Recebíveis ──────────────────────────────────
const RecebivelDossieBaseSchema = zod_1.z.object({
    unidadeId: zod_1.z.string().uuid().optional(),
    numeroContrato: zod_1.z.string().max(60).optional(),
    numeroUnidade: zod_1.z.string().min(1, "Nº da unidade é obrigatório").max(30),
    clienteNome: zod_1.z.string().max(200).optional(),
    parcelaAtual: zod_1.z
        .number()
        .int("Nº da parcela deve ser um número inteiro")
        .positive("Nº da parcela deve ser maior que zero"),
    totalParcelas: zod_1.z
        .number()
        .int("Total de parcelas deve ser um número inteiro")
        .positive("Total de parcelas deve ser maior que zero"),
    dataVencimento: zod_1.z.string().datetime(),
    dataPagamento: zod_1.z.string().datetime().nullable().optional(),
    valorParcela: zod_1.z.number().positive("Valor da parcela deve ser maior que zero"),
    valorRecebido: valorMonetarioSchema.nullable().optional(),
});
exports.RecebivelDossieSchema = RecebivelDossieBaseSchema.refine((r) => r.parcelaAtual <= r.totalParcelas, {
    path: ["parcelaAtual"],
    message: "Nº da parcela não pode ser maior que o total de parcelas",
});
exports.AtualizarRecebivelDossieSchema = RecebivelDossieBaseSchema.partial();
// ── Etapa 5: Distratos ───────────────────────────────────────────────
const DistratoDossieBaseSchema = zod_1.z.object({
    unidadeId: zod_1.z.string().uuid().optional(),
    numeroContrato: zod_1.z.string().max(60).optional(),
    numeroUnidade: zod_1.z.string().min(1, "Nº da unidade é obrigatório").max(30),
    clienteNome: zod_1.z.string().max(200).optional(),
    dataVenda: zod_1.z.string().datetime().optional(),
    dataDistrato: zod_1.z.string().datetime(),
    valorRecebido: valorMonetarioSchema.optional(),
    valorRestituido: valorMonetarioSchema.optional(),
    motivo: zod_1.z.string().max(500).optional(),
});
exports.DistratoDossieSchema = DistratoDossieBaseSchema.refine((d) => !d.dataVenda || d.dataVenda <= d.dataDistrato, {
    path: ["dataDistrato"],
    message: "Data do distrato não pode ser anterior à data da venda",
});
exports.AtualizarDistratoDossieSchema = DistratoDossieBaseSchema.partial();
// ── Etapa 6: Documentos anexos (S3) ──────────────────────────────────
const DocumentoDossieBaseSchema = zod_1.z.object({
    tipo: exports.TipoDocumentoDossieEnum,
    url: zod_1.z.string().url("URL do arquivo inválida"),
    nomeArquivo: zod_1.z.string().max(255).optional(),
    anoExercicio: zod_1.z
        .number()
        .int("Ano do exercício deve ser um número inteiro")
        .min(1990, "Ano do exercício deve ser a partir de 1990")
        .max(2100, "Ano do exercício inválido")
        .optional(),
    descricao: zod_1.z.string().max(500).optional(),
});
exports.DocumentoDossieSchema = DocumentoDossieBaseSchema.superRefine((d, ctx) => {
    if (d.tipo === "DEMONSTRACAO_FINANCEIRA" && d.anoExercicio == null) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["anoExercicio"],
            message: "Ano do exercício é obrigatório para demonstrações financeiras",
        });
    }
    if (d.tipo === "OUTRO" && !d.descricao) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["descricao"],
            message: "Descrição é obrigatória para documentos do tipo OUTRO",
        });
    }
});
exports.AtualizarDocumentoDossieSchema = DocumentoDossieBaseSchema.partial();
// ── Etapa 7: Empresa desenvolvedora/controladora ─────────────────────
exports.EmpresaDesenvolvedoraSchema = zod_1.z.object({
    empresaNome: zod_1.z.string().min(2).max(200),
    empresaCnpj: cnpjSchema,
    empresaWebsite: zod_1.z
        .string()
        .url("Website inválido (use URL completa, ex: https://empresa.com.br)")
        .optional(),
    empresaAnoFundacao: zod_1.z
        .number()
        .int("Ano de fundação deve ser um número inteiro")
        .min(1800, "Ano de fundação inválido")
        .max(new Date().getFullYear(), "Ano de fundação não pode ser no futuro"),
});
exports.AtualizarEmpresaDesenvolvedoraSchema = exports.EmpresaDesenvolvedoraSchema.partial();
// ── Wizard / status ──────────────────────────────────────────────────
exports.ConcluirEtapaDossieSchema = zod_1.z.object({
    etapa: zod_1.z
        .number()
        .int()
        .min(1, "Etapa inválida")
        .max(exports.DOSSIE_WIZARD_TOTAL_ETAPAS, "Etapa inválida"),
});
exports.AtualizarStatusDossieSchema = zod_1.z.object({
    status: exports.StatusDossieEnum,
    observacoes: zod_1.z.string().max(1000).optional(),
});
// ── Import XLSX/CSV (linhas de planilha) ─────────────────────────────
// Aceitam valores como vêm de planilhas: números em formato BR ("1.234,56"),
// datas DD/MM/AAAA, ISO ou serial Excel, células vazias, etc.
const normalizaTexto = (v) => {
    if (v == null)
        return undefined;
    const s = String(v).trim();
    return s === "" ? undefined : s;
};
const normalizaCpfCnpj = (v) => {
    const s = normalizaTexto(v);
    return typeof s === "string" ? s.replace(/\D/g, "") : s;
};
const normalizaNumero = (v) => {
    if (v == null || v === "")
        return undefined;
    if (typeof v === "number")
        return v;
    if (typeof v === "string") {
        let s = v.trim().replace(/^R\$\s*/i, "").replace(/%$/, "").trim();
        if (s === "")
            return undefined;
        if (s.includes(","))
            s = s.replace(/\./g, "").replace(",", ".");
        const n = Number(s);
        return Number.isNaN(n) ? v : n;
    }
    return v;
};
const normalizaData = (v) => {
    if (v == null || v === "")
        return undefined;
    if (v instanceof Date)
        return v;
    // Serial de data do Excel (dias desde 30/12/1899)
    if (typeof v === "number") {
        return new Date(Math.round((v - 25569) * 86400 * 1000));
    }
    if (typeof v === "string") {
        const s = v.trim();
        if (s === "")
            return undefined;
        const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (br)
            return new Date(`${br[3]}-${br[2]}-${br[1]}T00:00:00.000Z`);
        const d = new Date(s);
        if (!Number.isNaN(d.getTime()))
            return d;
    }
    return v;
};
const normalizaEnum = (v) => {
    const s = normalizaTexto(v);
    return typeof s === "string" ? s.toUpperCase().replace(/\s+/g, "_") : s;
};
const dataImport = (campo, obrigatorio = false) => zod_1.z.preprocess(normalizaData, obrigatorio
    ? zod_1.z.date({
        required_error: `${campo} é obrigatório(a)`,
        invalid_type_error: `${campo}: data inválida (use DD/MM/AAAA)`,
    })
    : zod_1.z
        .date({ invalid_type_error: `${campo}: data inválida (use DD/MM/AAAA)` })
        .optional());
exports.ImportUnidadeRowSchema = zod_1.z
    .object({
    numeroContrato: zod_1.z.preprocess(normalizaTexto, zod_1.z.string().max(60).optional()),
    numeroUnidade: zod_1.z.preprocess(normalizaTexto, zod_1.z
        .string({ required_error: "Nº da unidade é obrigatório" })
        .min(1, "Nº da unidade é obrigatório")
        .max(30, "Nº da unidade deve ter no máximo 30 caracteres")),
    areaPrivativaM2: zod_1.z.preprocess(normalizaNumero, zod_1.z
        .number({
        required_error: "Área privativa (m²) é obrigatória",
        invalid_type_error: "Área privativa (m²): número inválido",
    })
        .positive("Área privativa (m²) deve ser maior que zero")),
    clienteNome: zod_1.z.preprocess(normalizaTexto, zod_1.z.string().max(200).optional()),
    clienteCpfCnpj: zod_1.z.preprocess(normalizaCpfCnpj, cpfCnpjSchema.optional()),
    dataVenda: dataImport("Data da venda"),
    valorVenda: zod_1.z.preprocess(normalizaNumero, zod_1.z
        .number({ invalid_type_error: "Valor da venda: número inválido" })
        .nonnegative("Valor da venda não pode ser negativo")
        .optional()),
    valorTabela: zod_1.z.preprocess(normalizaNumero, zod_1.z
        .number({ invalid_type_error: "Valor de tabela: número inválido" })
        .nonnegative("Valor de tabela não pode ser negativo")
        .optional()),
    status: zod_1.z.preprocess(normalizaEnum, zod_1.z.enum(exports.StatusUnidadeDossieEnum.options, {
        errorMap: () => ({
            message: "Status inválido (use VENDIDA, PERMUTA, ESTOQUE ou QUITADA)",
        }),
    })),
    indexador: zod_1.z.preprocess(normalizaTexto, zod_1.z.string().max(30).optional()),
    taxaJurosMensal: zod_1.z.preprocess(normalizaNumero, zod_1.z
        .number({ invalid_type_error: "Taxa de juros (% a.m.): número inválido" })
        .min(0, "Taxa de juros (% a.m.) não pode ser negativa")
        .max(20, "Taxa de juros (% a.m.) não pode ser maior que 20")
        .optional()),
    sistemaAmortizacao: zod_1.z.preprocess(normalizaEnum, zod_1.z
        .enum(exports.SistemaAmortizacaoEnum.options, {
        errorMap: () => ({
            message: "Sistema de amortização inválido (use PRICE, SAC ou SACOC)",
        }),
    })
        .optional()),
})
    .superRefine((u, ctx) => {
    if ((u.status === "VENDIDA" || u.status === "QUITADA") &&
        !u.clienteNome) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["clienteNome"],
            message: "Nome do cliente é obrigatório para unidades vendidas/quitadas",
        });
    }
});
exports.ImportRecebivelRowSchema = zod_1.z
    .object({
    numeroContrato: zod_1.z.preprocess(normalizaTexto, zod_1.z.string().max(60).optional()),
    numeroUnidade: zod_1.z.preprocess(normalizaTexto, zod_1.z
        .string({ required_error: "Nº da unidade é obrigatório" })
        .min(1, "Nº da unidade é obrigatório")
        .max(30, "Nº da unidade deve ter no máximo 30 caracteres")),
    clienteNome: zod_1.z.preprocess(normalizaTexto, zod_1.z.string().max(200).optional()),
    parcelaAtual: zod_1.z.preprocess(normalizaNumero, zod_1.z
        .number({
        required_error: "Nº da parcela é obrigatório",
        invalid_type_error: "Nº da parcela: número inválido",
    })
        .int("Nº da parcela deve ser um número inteiro")
        .positive("Nº da parcela deve ser maior que zero")),
    totalParcelas: zod_1.z.preprocess(normalizaNumero, zod_1.z
        .number({
        required_error: "Total de parcelas é obrigatório",
        invalid_type_error: "Total de parcelas: número inválido",
    })
        .int("Total de parcelas deve ser um número inteiro")
        .positive("Total de parcelas deve ser maior que zero")),
    dataVencimento: dataImport("Data de vencimento", true),
    dataPagamento: dataImport("Data de pagamento"),
    valorParcela: zod_1.z.preprocess(normalizaNumero, zod_1.z
        .number({
        required_error: "Valor da parcela é obrigatório",
        invalid_type_error: "Valor da parcela: número inválido",
    })
        .positive("Valor da parcela deve ser maior que zero")),
    valorRecebido: zod_1.z.preprocess(normalizaNumero, zod_1.z
        .number({ invalid_type_error: "Valor recebido: número inválido" })
        .nonnegative("Valor recebido não pode ser negativo")
        .optional()),
})
    .superRefine((r, ctx) => {
    if (r.parcelaAtual > r.totalParcelas) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["parcelaAtual"],
            message: "Nº da parcela não pode ser maior que o total de parcelas",
        });
    }
    if (r.dataPagamento && r.valorRecebido == null) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["valorRecebido"],
            message: "Informe o valor recebido quando houver data de pagamento",
        });
    }
});
// ── Submissão (completude do dossiê) ─────────────────────────────────
// Métricas derivadas (VGV, % vendido, valor recebido/a receber,
// inadimplência) NÃO entram aqui: são calculadas a partir de
// unidades/recebíveis, nunca armazenadas como campos editáveis.
exports.DossieSubmitSchema = zod_1.z
    .object({
    ficha: exports.FichaEmpreendimentoSchema,
    empresa: exports.EmpresaDesenvolvedoraSchema,
    possuiAcordoNaoConcorrenciaPermuta: zod_1.z.boolean().nullable(),
    unidades: zod_1.z
        .array(exports.UnidadeDossieSchema)
        .min(1, "Inclua ao menos uma unidade na Tabela de Unidades"),
    recebiveis: zod_1.z.array(exports.RecebivelDossieSchema).default([]),
    distratos: zod_1.z.array(exports.DistratoDossieSchema).default([]),
    documentos: zod_1.z.array(exports.DocumentoDossieSchema).default([]),
    etapasConcluidas: zod_1.z.array(zod_1.z.number().int().min(1).max(exports.DOSSIE_WIZARD_TOTAL_ETAPAS)),
})
    .superRefine((d, ctx) => {
    const faltantes = [];
    for (let etapa = 1; etapa <= exports.DOSSIE_WIZARD_TOTAL_ETAPAS; etapa++) {
        if (!d.etapasConcluidas.includes(etapa))
            faltantes.push(etapa);
    }
    if (faltantes.length > 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["etapasConcluidas"],
            message: `Conclua todas as etapas antes de submeter (pendentes: ${faltantes.join(", ")})`,
        });
    }
    const temPermuta = d.unidades.some((u) => u.status === "PERMUTA");
    if (temPermuta && d.possuiAcordoNaoConcorrenciaPermuta === null) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["possuiAcordoNaoConcorrenciaPermuta"],
            message: "Informe se existe acordo de não concorrência para as unidades em permuta",
        });
    }
    if (temPermuta &&
        d.possuiAcordoNaoConcorrenciaPermuta === true &&
        !d.documentos.some((doc) => doc.tipo === "ACORDO_PERMUTA")) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["documentos"],
            message: "Anexe o documento do acordo de permuta (ACORDO_PERMUTA)",
        });
    }
    const tiposObrigatorios = [
        "DEMONSTRACAO_FINANCEIRA",
        "CRONOGRAMA_FISICO_FINANCEIRO",
    ];
    for (const tipo of tiposObrigatorios) {
        if (!d.documentos.some((doc) => doc.tipo === tipo)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["documentos"],
                message: `Documento obrigatório ausente: ${tipo}`,
            });
        }
    }
});
