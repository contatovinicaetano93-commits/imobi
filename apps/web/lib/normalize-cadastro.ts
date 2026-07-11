import type { CadastroUsuarioInput } from '@imbobi/schemas';

/** Normaliza e-mail antes de enviar à API. */
export function normalizeCadastroInput(data: CadastroUsuarioInput): CadastroUsuarioInput {
  return {
    ...data,
    email: data.email.trim().toLowerCase(),
  };
}
