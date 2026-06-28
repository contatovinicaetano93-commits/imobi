import { z } from "zod";

export const ConfiguracaoSistemaSchema = z
  .object({
    taxaMensalMin: z.number().min(0.1).max(10),
    taxaMensalMax: z.number().min(0.1).max(10),
    taxaPadrao: z.number().min(0.1).max(10),
    valorMinCredito: z.number().min(10_000).max(50_000_000),
    valorMaxCredito: z.number().min(10_000).max(50_000_000),
    prazoMaxMeses: z.number().int().min(6).max(360),
    raioValidacaoMetrosPadrao: z.number().int().min(10).max(5000),
    toleranciaPrecisaoGps: z.number().int().min(5).max(200),
    diasAprovacao: z.number().int().min(1).max(60),
    limiteEvidenciasMB: z.number().int().min(1).max(50),
    modoManutencao: z.boolean(),
  })
  .refine((d) => d.taxaMensalMin <= d.taxaPadrao && d.taxaPadrao <= d.taxaMensalMax, {
    message: "Taxa padrão deve estar entre a mínima e a máxima",
  })
  .refine((d) => d.valorMinCredito <= d.valorMaxCredito, {
    message: "Valor mínimo não pode exceder o valor máximo",
  });

export type ConfiguracaoSistemaInput = z.infer<typeof ConfiguracaoSistemaSchema>;
