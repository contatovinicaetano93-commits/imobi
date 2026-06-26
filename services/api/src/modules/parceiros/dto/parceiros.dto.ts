import { z } from "zod";

export const AdicionarMailingSchema = z.object({
  nome: z.string().min(2).max(200),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().min(10).max(20).optional(),
});

export type AdicionarMailingDto = z.infer<typeof AdicionarMailingSchema>;
