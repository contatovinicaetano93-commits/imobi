"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtapasPadraoEnum = exports.CriarEtapaSchema = exports.CriarObraSchema = exports.GeolocalizacaoSchema = exports.EnderecoSchema = exports.StatusEtapaEnum = exports.StatusObraEnum = void 0;
const zod_1 = require("zod");
exports.StatusObraEnum = zod_1.z.enum([
    "PLANEJAMENTO",
    "EM_ANDAMENTO",
    "PAUSADA",
    "CONCLUIDA",
    "CANCELADA",
]);
exports.StatusEtapaEnum = zod_1.z.enum([
    "PENDENTE",
    "EM_PROGRESSO",
    "AGUARDANDO_VISTORIA",
    "APROVADA",
    "REJEITADA",
]);
exports.EnderecoSchema = zod_1.z.object({
    logradouro: zod_1.z.string().min(3).max(200),
    numero: zod_1.z.string().max(10),
    complemento: zod_1.z.string().max(50).optional(),
    bairro: zod_1.z.string().max(100),
    cidade: zod_1.z.string().max(100),
    uf: zod_1.z.string().length(2),
    cep: zod_1.z.string().regex(/^\d{8}$/, "CEP inválido"),
});
exports.GeolocalizacaoSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    raioValidacaoMetros: zod_1.z.number().int().min(20).max(500).default(80),
});
exports.CriarObraSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3).max(120),
    endereco: exports.EnderecoSchema,
    geo: exports.GeolocalizacaoSchema,
    areaM2: zod_1.z.number().positive().max(100000),
    datainicioISO: zod_1.z.string().datetime().optional(),
    dataConclusaoPrevistaISO: zod_1.z.string().datetime(),
    creditoId: zod_1.z.string().uuid().optional(),
});
exports.CriarEtapaSchema = zod_1.z.object({
    obraId: zod_1.z.string().uuid(),
    nome: zod_1.z.string().min(2).max(100),
    descricao: zod_1.z.string().max(1000).optional(),
    ordem: zod_1.z.number().int().positive(),
    percentualObra: zod_1.z.number().min(0.01).max(100),
    dataInicio: zod_1.z.string().datetime().optional(),
    dataConclusaoPrevista: zod_1.z.string().datetime().optional(),
});
exports.EtapasPadraoEnum = zod_1.z.enum([
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
