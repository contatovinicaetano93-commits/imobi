import { ApiError } from "@imbobi/core";

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Sua sessão expirou. Faça login novamente.";
    }
    if (error.status === 403) {
      return "Você não tem permissão para acessar este recurso.";
    }
    if (error.status === 404) {
      return "Recurso não encontrado.";
    }
    if (error.status === 409) {
      return "Este recurso já existe ou há um conflito.";
    }
    if (error.status === 422) {
      return "Os dados fornecidos são inválidos.";
    }
    if (error.status >= 500) {
      return "Erro no servidor. Tente novamente mais tarde.";
    }
    return error.message || "Erro ao processar requisição.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Erro inesperado. Tente novamente.";
}

export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function isValidationError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 422;
}

export function isConflictError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}
