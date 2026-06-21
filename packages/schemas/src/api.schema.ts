import { z } from "zod";

// ── Vistoria ────────────────────────────────────────────────────────────

export const VistoriaAprovarSchema = z.object({
  obraId: z.string().uuid().optional(),
  observacoes: z.string().max(2000).optional(),
});

export const VistoriaRejeitarSchema = z.object({
  motivo: z.string().min(5, "Motivo deve ter pelo menos 5 caracteres").max(2000),
});

export type VistoriaAprovarInput = z.infer<typeof VistoriaAprovarSchema>;
export type VistoriaRejeitarInput = z.infer<typeof VistoriaRejeitarSchema>;

// ── Comitê Digital ──────────────────────────────────────────────────────

export const ComiteSolicitarSchema = z.object({
  valorSolicitado: z.number().positive("Valor deve ser positivo"),
  prazoMeses: z.number().int().min(1).max(360),
  finalidade: z.string().min(5, "Finalidade obrigatória").max(1000),
  garantias: z.string().max(2000).optional(),
  observacoes: z.string().max(2000).optional(),
  obraId: z.string().uuid().optional(),
  vgv: z.number().positive().optional(),
  custoObra: z.number().positive().optional(),
  ltv: z.number().min(0).max(100).optional(),
});

export const ComiteParecerSchema = z.object({
  parecerTecnico: z.string().min(10, "Parecer deve ter pelo menos 10 caracteres").max(5000),
});

export const VotoDecisaoEnum = z.enum(["APROVAR", "AJUSTAR", "REPROVAR"]);

export const ComiteVotarSchema = z.object({
  voto: VotoDecisaoEnum,
  justificativa: z.string().min(5).max(2000).optional(),
  condicoes: z.string().max(2000).optional(),
});

export const ComiteDecisaoEnum = z.enum(["APROVADO", "AJUSTADO", "REPROVADO"]);

export const ComiteEncerrarSchema = z.object({
  decisao: ComiteDecisaoEnum,
  motivo: z.string().max(2000).optional(),
});

export type ComiteSolicitarInput = z.infer<typeof ComiteSolicitarSchema>;
export type ComiteParecerInput = z.infer<typeof ComiteParecerSchema>;
export type ComiteVotarInput = z.infer<typeof ComiteVotarSchema>;
export type ComiteEncerrarInput = z.infer<typeof ComiteEncerrarSchema>;

// ── Marketplace ────────────────────────────────────────────────────────

export const MarketplaceAvaliarSchema = z.object({
  nota: z
    .number()
    .int("Nota deve ser inteiro")
    .min(1, "Nota mínima: 1")
    .max(5, "Nota máxima: 5"),
  comentario: z.string().max(1000).optional(),
});

export const FornecedorTipoEnum = z.enum([
  "MATERIAL_CONSTRUCAO",
  "MAO_DE_OBRA",
  "EQUIPAMENTO",
  "PROJETO_ARQUITETURA",
  "ENGENHARIA",
  "OUTROS",
]);

export const MarketplaceCriarFornecedorSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório").max(200),
  tipo: FornecedorTipoEnum,
  descricao: z.string().max(2000).optional(),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  telefone: z
    .string()
    .regex(/^\d{10,11}$/, "Telefone inválido")
    .optional(),
  email: z.string().email("Email inválido").optional(),
  endereco: z.string().max(500).optional(),
  uf: z.string().length(2, "UF deve ter 2 caracteres").optional(),
  cidade: z.string().max(100).optional(),
  geoLatitude: z.number().min(-90).max(90).optional(),
  geoLongitude: z.number().min(-180).max(180).optional(),
});

export type MarketplaceAvaliarInput = z.infer<typeof MarketplaceAvaliarSchema>;
export type MarketplaceCriarFornecedorInput = z.infer<typeof MarketplaceCriarFornecedorSchema>;

// ── Parceiros ──────────────────────────────────────────────────────────

export const AdicionarMailingSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório").max(200),
  email: z.string().email("E-mail inválido"),
  telefone: z
    .string()
    .regex(/^\d{10,11}$/, "Telefone inválido")
    .optional(),
});

export type AdicionarMailingInput = z.infer<typeof AdicionarMailingSchema>;

// ── KYC ───────────────────────────────────────────────────────────────

export const KycDocumentoTipoEnum = z.enum([
  "RG",
  "CPF",
  "CNH",
  "PASSAPORTE",
  "COMPROVANTE_RESIDENCIA",
  "CNPJ",
  "CONTRATO_SOCIAL",
  "OUTROS",
]);

export const KycUploadSchema = z.object({
  tipo: KycDocumentoTipoEnum,
  url: z.string().url("URL do documento inválida").refine(
    (url) => {
      try {
        const { hostname } = new URL(url);
        return hostname.endsWith(".amazonaws.com") || hostname.endsWith(".cloudfront.net");
      } catch { return false; }
    },
    { message: "URL deve ser um endereço S3 ou CloudFront válido" },
  ),
});

export const KycRejeitarSchema = z.object({
  motivo: z.string().min(5, "Motivo de rejeição obrigatório").max(1000),
});

export type KycUploadInput = z.infer<typeof KycUploadSchema>;
export type KycRejeitarInput = z.infer<typeof KycRejeitarSchema>;

// ── Push Notificações ──────────────────────────────────────────────────

export const PushTokenSchema = z.object({
  token: z.string().min(10, "Token FCM inválido").max(500),
});

export type PushTokenInput = z.infer<typeof PushTokenSchema>;

// ── Usuários (LGPD) ────────────────────────────────────────────────────

export const RevogarConsentimentoSchema = z.object({
  tipo: z.enum(["MARKETING", "NOTIFICACOES", "TUDO"], {
    errorMap: () => ({ message: "Tipo deve ser MARKETING, NOTIFICACOES ou TUDO" }),
  }),
});

export type RevogarConsentimentoInput = z.infer<typeof RevogarConsentimentoSchema>;

// ── Etapas ────────────────────────────────────────────────────────────

export const EtapaStatusEnum = z.enum([
  "PLANEJADA",
  "EM_ANDAMENTO",
  "AGUARDANDO_VISTORIA",
  "CONCLUIDA",
  "REPROVADA",
]);

export const EtapaAtualizarStatusSchema = z.object({
  status: EtapaStatusEnum,
});

export type EtapaAtualizarStatusInput = z.infer<typeof EtapaAtualizarStatusSchema>;

// ── Admin ─────────────────────────────────────────────────────────────

export const UsuarioTipoEnum = z.enum([
  "ADMIN",
  "GESTOR",
  "GESTOR_FUNDO",
  "ENGENHEIRO",
  "GESTOR_OBRA",
  "COMERCIAL",
  "PARCEIRO",
  "CONSTRUTOR",
  "TOMADOR",
]);

export const CriarUsuarioAdminSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório").max(200),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").max(100),
  tipo: UsuarioTipoEnum,
});

export const ReprovarHomologacaoSchema = z.object({
  motivo: z.string().min(5, "Motivo obrigatório").max(2000),
});

export const ConfirmarPagamentoSchema = z.object({
  referenciaPagamento: z.string().max(200).optional(),
});

export type CriarUsuarioAdminInput = z.infer<typeof CriarUsuarioAdminSchema>;
export type ReprovarHomologacaoInput = z.infer<typeof ReprovarHomologacaoSchema>;
export type ConfirmarPagamentoInput = z.infer<typeof ConfirmarPagamentoSchema>;

// ── Due Diligence ─────────────────────────────────────────────────────

export const CriarDueDiligenceSchema = z.object({
  nomeEmpreendimento: z.string().min(2, "Nome obrigatório").max(400),
  tipologia: z.string().max(200).optional(),
  endereco: z.string().max(500).optional(),
  cidade: z.string().max(200).optional(),
  uf: z.string().length(2).optional(),
  totalUnidades: z.number().int().min(0).optional().nullable(),
  nomeIncorporadora: z.string().max(300).optional(),
  cnpjIncorporadora: z.string().max(18).optional(),
  modeloAmortizacao: z.string().max(200).optional().nullable(),
  totalCarteira: z.number().min(0).optional().nullable(),
  totalAReceber: z.number().min(0).optional().nullable(),
  estruturaSocietaria: z.string().max(2000).optional(),
  payload: z.record(z.unknown()),
});

export const AtualizarDueDiligenceStatusEnum = z.enum([
  "ENVIADO",
  "EM_ANALISE",
  "APROVADO",
  "REPROVADO",
  "PENDENTE_DOCUMENTOS",
]);

export const AtualizarDueDiligenceStatusSchema = z.object({
  status: AtualizarDueDiligenceStatusEnum,
});

export type CriarDueDiligenceInput = z.infer<typeof CriarDueDiligenceSchema>;
export type AtualizarDueDiligenceStatusInput = z.infer<typeof AtualizarDueDiligenceStatusSchema>;

// ── Engenheiros / Visitas ──────────────────────────────────────────────

export const VisitaStatusEnum = z.enum([
  "AGENDADA",
  "REALIZADA",
  "CANCELADA",
]);

export const AtualizarVisitaSchema = z.object({
  status: VisitaStatusEnum.optional(),
  dataAgendada: z.string().datetime({ offset: true }).optional(),
  observacoes: z.string().max(2000).optional(),
});

export type AtualizarVisitaInput = z.infer<typeof AtualizarVisitaSchema>;

