import type { CadastroUsuarioInput } from '@imbobi/schemas';

/** Remove máscara de CPF/telefone antes de enviar à API. */
export function normalizeCadastroInput(data: CadastroUsuarioInput): CadastroUsuarioInput {
  return {
    ...data,
    cpf: data.cpf.replace(/\D/g, '').slice(0, 11),
    telefone: data.telefone.replace(/\D/g, '').slice(0, 11),
    email: data.email.trim().toLowerCase(),
  };
}
