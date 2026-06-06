"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiltroParceiroSchema = exports.UpdateParceiroSchema = exports.CadastroParceiroSchema = exports.TipoParceiroEnum = void 0;
const zod_1 = require("zod");
exports.TipoParceiroEnum = zod_1.z.enum([
    "CORRESPONDENTE",
    "IMOBILIARIA",
    "CONSTRUTORA",
    "INDEPENDENTE",
]);
exports.CadastroParceiroSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3).max(120),
    cpf: zod_1.z.string().regex(/^\d{11}$/, "CPF deve conter 11 dígitos numéricos"),
    email: zod_1.z.string().email(),
    telefone: zod_1.z.string().regex(/^\d{10,11}$/, "Telefone inválido"),
    tipo: exports.TipoParceiroEnum,
    cnpj: zod_1.z.string().regex(/^\d{14}$/, "CNPJ inválido").optional(),
    nomeEmpresa: zod_1.z.string().max(120).optional(),
    creciNumero: zod_1.z.string().max(30).optional(),
});
exports.UpdateParceiroSchema = exports.CadastroParceiroSchema.omit({ cpf: true }).partial();
exports.FiltroParceiroSchema = zod_1.z.object({
    tipo: exports.TipoParceiroEnum.optional(),
    ativo: zod_1.z.boolean().optional(),
    page: zod_1.z.number().int().positive().default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
});
