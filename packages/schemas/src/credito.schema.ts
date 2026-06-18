import { z } from "zod";

export const StatusCreditoEnum = z.enum([
  "ATIVO",
  "SUSPENSO",
  "VENCIDO",
  "QUITADO",
]);

export const TipoGarantiaEnum = z.enum(["IMOVEL", "RECEBIVEIS"]);

export const SimulacaoCreditoSchema = z.object({
  valorSolicitado: z
    .number()
    .min(50000, "Valor mínimo R$ 50.000")
    .max(5000000, "Valor máximo R$ 5.000.000"),
  prazoMeses: z
    .number()
    .int()
    .min(12, "Prazo mínimo 12 meses")
    .max(48, "Prazo máximo 48 meses"),
  tipoObra: z.enum(["RESIDENCIAL", "COMERCIAL", "MISTO"]),
  scoreConstrutibilidade: z.number().int().min(0).max(1000).optional(),
});

export const SolicitacaoCreditoSchema = SimulacaoCreditoSchema.extend({
  obraId: z.string().uuid().optional(),
  finalidade: z.string().max(500),
  rendaMensalDeclarada: z.number().positive(),
  tipoGarantia: TipoGarantiaEnum,
  creditoPonte: z.boolean().default(false),
});

export const LiberacaoParcelaSchema = z.object({
  creditoId: z.string().uuid(),
  etapaId: z.string().uuid(),
  valorLiberacao: z.number().positive(),
  observacaoGestor: z.string().max(1000).optional(),
});

export const DadosBancariosSchema = z.object({
  banco: z.string().min(2, "Informe o nome do banco"),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  tipoConta: z.enum(["CORRENTE", "POUPANCA"]).default("CORRENTE"),
  tipoChavePix: z
    .enum(["CPF", "CNPJ", "EMAIL", "TELEFONE", "ALEATORIA"])
    .optional(),
  chavePix: z.string().optional(),
  nomeTitular: z.string().min(3, "Informe o nome do titular"),
  cpfCnpjTitular: z
    .string()
    .min(11, "CPF ou CNPJ inválido")
    .max(18, "CPF ou CNPJ inválido"),
}).refine(
  (d) =>
    (d.agencia && d.conta) || (d.tipoChavePix && d.chavePix),
  "Informe agência + conta OU tipo + chave PIX",
);

export const ConfirmarTransferenciaSchema = z.object({
  observacao: z.string().max(500).optional(),
});

export type StatusCredito = z.infer<typeof StatusCreditoEnum>;
export type TipoGarantia = z.infer<typeof TipoGarantiaEnum>;
export type SimulacaoCreditoInput = z.infer<typeof SimulacaoCreditoSchema>;
export type SolicitacaoCreditoInput = z.infer<typeof SolicitacaoCreditoSchema>;
export type LiberacaoParcelaInput = z.infer<typeof LiberacaoParcelaSchema>;
export type DadosBancariosInput = z.infer<typeof DadosBancariosSchema>;
export type ConfirmarTransferenciaInput = z.infer<typeof ConfirmarTransferenciaSchema>;
