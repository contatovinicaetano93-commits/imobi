import { z } from "zod";
import { isValidCnpj } from "./validators";

export const CriarParceiroSchema = z.object({
  nome: z.string().min(3).max(200),
  cnpj: z
    .string()
    .refine((val) => isValidCnpj(val), "CNPJ inválido"),
  email: z.string().email(),
  telefone: z
    .string()
    .regex(/^\d{10,11}$/, "Telefone inválido"),
  endereco: z.string().min(5),
});

export type CriarParceiroInput = z.infer<typeof CriarParceiroSchema>;
