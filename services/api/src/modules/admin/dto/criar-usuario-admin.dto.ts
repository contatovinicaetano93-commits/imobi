import { z } from "zod";

export const CriarUsuarioAdminSchema = z.object({
  nome: z.string().min(2).max(200),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(100),
  tipo: z.enum(["TOMADOR", "GESTOR_OBRA", "ADMIN", "PARCEIRO", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "COMERCIAL", "CONSTRUTOR"]),
});

export type CriarUsuarioAdminSchemaDto = z.infer<typeof CriarUsuarioAdminSchema>;
