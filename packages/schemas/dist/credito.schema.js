"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmarTransferenciaSchema = exports.DadosBancariosSchema = exports.LiberacaoParcelaSchema = exports.SolicitacaoCreditoSchema = exports.SimulacaoCreditoSchema = exports.TipoGarantiaEnum = exports.StatusCreditoEnum = void 0;
const zod_1 = require("zod");
exports.StatusCreditoEnum = zod_1.z.enum([
    "ATIVO",
    "SUSPENSO",
    "VENCIDO",
    "QUITADO",
]);
exports.TipoGarantiaEnum = zod_1.z.enum(["IMOVEL", "RECEBIVEIS"]);
exports.SimulacaoCreditoSchema = zod_1.z.object({
    valorSolicitado: zod_1.z
        .number()
        .min(50000, "Valor mínimo R$ 50.000")
        .max(5000000, "Valor máximo R$ 5.000.000"),
    prazoMeses: zod_1.z
        .number()
        .int()
        .min(12, "Prazo mínimo 12 meses")
        .max(48, "Prazo máximo 48 meses"),
    tipoObra: zod_1.z.enum(["RESIDENCIAL", "COMERCIAL", "MISTO"]),
    scoreConstrutibilidade: zod_1.z.number().int().min(0).max(1000).optional(),
});
exports.SolicitacaoCreditoSchema = exports.SimulacaoCreditoSchema.extend({
    obraId: zod_1.z.string().uuid().optional(),
    finalidade: zod_1.z.string().max(500),
    rendaMensalDeclarada: zod_1.z.number().positive(),
    tipoGarantia: exports.TipoGarantiaEnum,
    creditoPonte: zod_1.z.boolean().default(false),
});
exports.LiberacaoParcelaSchema = zod_1.z.object({
    creditoId: zod_1.z.string().uuid(),
    etapaId: zod_1.z.string().uuid(),
    valorLiberacao: zod_1.z.number().positive(),
    observacaoGestor: zod_1.z.string().max(1000).optional(),
});
exports.DadosBancariosSchema = zod_1.z.object({
    banco: zod_1.z.string().min(2, "Informe o nome do banco"),
    agencia: zod_1.z.string().optional(),
    conta: zod_1.z.string().optional(),
    tipoConta: zod_1.z.enum(["CORRENTE", "POUPANCA"]).default("CORRENTE"),
    tipoChavePix: zod_1.z
        .enum(["CPF", "CNPJ", "EMAIL", "TELEFONE", "ALEATORIA"])
        .optional(),
    chavePix: zod_1.z.string().optional(),
    nomeTitular: zod_1.z.string().min(3, "Informe o nome do titular"),
    cpfCnpjTitular: zod_1.z
        .string()
        .min(11, "CPF ou CNPJ inválido")
        .max(18, "CPF ou CNPJ inválido"),
}).refine((d) => (d.agencia && d.conta) || (d.tipoChavePix && d.chavePix), "Informe agência + conta OU tipo + chave PIX");
exports.ConfirmarTransferenciaSchema = zod_1.z.object({
    observacao: zod_1.z.string().max(500).optional(),
});
