import { z } from "zod";

export const StatusObraEnum = z.enum([
  "PLANEJAMENTO",
  "EM_EXECUCAO",
  "PAUSADA",
  "CONCLUIDA",
  "CANCELADA",
]);

export const StatusEtapaEnum = z.enum([
  "PLANEJADA",
  "EM_EXECUCAO",
  "AGUARDANDO_VISTORIA",
  "REPROVADA",
  "CONCLUIDA",
]);

export const EnderecoSchema = z.object({
  logradouro: z.string().min(3).max(200),
  numero: z.string().max(10),
  complemento: z.string().max(50).optional(),
  bairro: z.string().max(100),
  cidade: z.string().max(100),
  uf: z.string().length(2),
  cep: z.string().regex(/^\d{8}$/, "CEP inválido"),
});

export const GeolocalizacaoSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  raioValidacaoMetros: z.number().int().min(20).max(500).default(80),
});

export const CriarObraSchema = z.object({
  nome: z.string().min(3).max(120),
  endereco: EnderecoSchema,
  geo: GeolocalizacaoSchema,
  areaM2: z.number().positive().max(100000),
  datainicioISO: z.string().datetime().optional(),
  dataConclusaoPrevistaISO: z.string().datetime(),
  creditoId: z.string().uuid().optional(),
});

export const CriarEtapaSchema = z.object({
  obraId: z.string().uuid(),
  nome: z.string().min(2).max(100),
  descricao: z.string().max(1000).optional(),
  ordem: z.number().int().positive(),
  percentualObra: z.number().min(0.01).max(100),
  dataInicio: z.string().datetime().optional(),
  dataConclusaoPrevista: z.string().datetime().optional(),
});

export const EtapasPadraoEnum = z.enum([
  "FUNDACAO",
  "ESTRUTURA",
  "ALVENARIA",
  "COBERTURA",
  "INSTALACOES_ELETRICAS",
  "INSTALACOES_HIDRAULICAS",
  "REVESTIMENTO",
  "ACABAMENTO",
  "ENTREGA",
]);

export const AprovarVistoriaSchema = z.object({
  observacoes: z.string().max(1000).optional(),
});

export const RejeitarVistoriaSchema = z.object({
  motivo: z.string().min(10, "Motivo deve ter ao menos 10 caracteres").max(1000),
});

export type StatusObra = z.infer<typeof StatusObraEnum>;
export type StatusEtapa = z.infer<typeof StatusEtapaEnum>;
export type EnderecoInput = z.infer<typeof EnderecoSchema>;
export type GeolocalizacaoInput = z.infer<typeof GeolocalizacaoSchema>;
export type CriarObraInput = z.infer<typeof CriarObraSchema>;
export type CriarEtapaInput = z.infer<typeof CriarEtapaSchema>;
export type EtapaPadrao = z.infer<typeof EtapasPadraoEnum>;
export type AprovarVistoriaInput = z.infer<typeof AprovarVistoriaSchema>;
export type RejeitarVistoriaInput = z.infer<typeof RejeitarVistoriaSchema>;
