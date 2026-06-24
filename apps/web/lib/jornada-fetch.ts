import { jornadaApi, ApiError, type Jornada } from "@/lib/api";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1500;
const REQUEST_TIMEOUT_MS = 20_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Jornada request timeout")), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

/**
 * Busca jornada com retry — Render cold start + deploy em andamento.
 * 404 = rota ausente na API (deploy desatualizado), não adianta retry infinito.
 */
export async function obterJornadaResiliente(): Promise<Jornada> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await withTimeout(jornadaApi.obter(), REQUEST_TIMEOUT_MS);
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && error.status === 404) {
        throw error;
      }
      if (attempt < MAX_ATTEMPTS) {
        const delay =
          error instanceof ApiError && error.status === 429
            ? BASE_DELAY_MS * attempt * 3
            : BASE_DELAY_MS * attempt;
        await sleep(delay);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Falha ao carregar jornada");
}

export function mensagemErroJornada(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "A API staging ainda não tem o endpoint /jornada. Aguarde 2–5 min após o redeploy no Render ou rode: pnpm render:redeploy:staging";
  }
  if (error instanceof ApiError && error.status === 429) {
    return "Muitas tentativas em sequência. Aguarde 30 segundos e clique em Tentar novamente.";
  }
  if (error instanceof ApiError && error.status === 401) {
    return "Sessão expirada. Faça logout e login novamente.";
  }
  return "Não foi possível carregar seu próximo passo. A API pode estar acordando — aguarde e tente de novo.";
}
