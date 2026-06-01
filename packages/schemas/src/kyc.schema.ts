import { z } from "zod";

export const KYCInputSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos"),
  telefone: z.string().regex(/^\d{10,11}$/, "Telefone inválido"),
  tipoObra: z.enum(["TERRENO", "CONSTRUCAO", "ACABAMENTO", "COMPRADOR"]),
});

export type KYCInput = z.infer<typeof KYCInputSchema>;

export const KYCStatusSchema = z.enum([
  "PENDENTE",
  "APROVADO",
  "REJEITADO",
  "BLOQUEADO",
]);

export type KYCStatus = z.infer<typeof KYCStatusSchema>;
