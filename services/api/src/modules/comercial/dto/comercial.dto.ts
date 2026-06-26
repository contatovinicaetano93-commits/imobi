import { z } from "zod";

export const CriarLeadSchema = z.object({
  nome: z.string().min(2).max(200),
  email: z.string().email().optional(),
  telefone: z.string().min(10).max(20).optional(),
  empresa: z.string().max(200).optional(),
  fonte: z.string().max(100).optional(),
  segmentoCliente: z.string().max(100).optional(),
  observacoes: z.string().max(2000).optional(),
  stageId: z.string().optional(),
});

export const CriarAtividadeSchema = z.object({
  tipo: z.string().min(1).max(100),
  descricao: z.string().min(1).max(2000),
  dataAtividade: z.string().datetime().optional(),
});

export type CriarLeadDto = z.infer<typeof CriarLeadSchema>;
export type CriarAtividadeDto = z.infer<typeof CriarAtividadeSchema>;
