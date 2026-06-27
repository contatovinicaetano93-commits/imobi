import { z } from "zod";

export const TipoCreditoPropostaEnum = z.enum([
  "OBRA_NOVA",
  "OBRA_EM_ANDAMENTO",
  "CREDITO_PONTE",
]);

export const PropostaCreditoStatusEnum = z.enum([
  "RECEBIDA",
  "EM_ANALISE",
  "APROVADA",
  "REJEITADA",
]);

const percentualFisicoField = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? v : n;
  },
  z.number().min(0).max(100).optional(),
);

export const EnviarPropostaPublicaSchema = z
  .object({
    tipoCredito: TipoCreditoPropostaEnum,
    nomeEmpreendimento: z.string().min(3).max(255),
    nomeContato: z.string().min(2).max(120),
    email: z.string().email(),
    telefone: z.string().min(10).max(20),
    empresa: z.string().max(255).optional(),
    narrativa: z.string().max(5000).optional(),
    dataBase: z.coerce.date().optional(),
    percentualFisico: percentualFisicoField,
  })
  .superRefine((data, ctx) => {
    if (data.tipoCredito !== "OBRA_NOVA" && data.percentualFisico == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o percentual físico da obra (0–100).",
        path: ["percentualFisico"],
      });
    }
  });

export const ChecklistTipoCreditoQuerySchema = z.object({
  tipo: TipoCreditoPropostaEnum,
});

export type TipoCreditoProposta = z.infer<typeof TipoCreditoPropostaEnum>;
export type PropostaCreditoStatus = z.infer<typeof PropostaCreditoStatusEnum>;
export type EnviarPropostaPublicaInput = z.infer<typeof EnviarPropostaPublicaSchema>;
export type ChecklistTipoCreditoQuery = z.infer<typeof ChecklistTipoCreditoQuerySchema>;
