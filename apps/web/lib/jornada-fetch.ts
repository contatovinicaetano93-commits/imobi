import { jornadaApi, ApiError, type Jornada } from "@/lib/api";

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Busca jornada com retry — Render cold start + deploy em andamento.
 * 404 = rota ausente na API (deploy desatualizado), não adianta retry infinito.
 */
export async function obterJornadaResiliente(): Promise<Jornada> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await jornadaApi.obter();
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && error.status === 404) {
        throw error;
      }
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BASE_DELAY_MS * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Falha ao carregar jornada");
}

export function mensagemErroJornada(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "A API staging ainda não tem o endpoint /jornada. Aguarde 2–5 min após o redeploy no Render ou rode: pnpm render:redeploy:staging";
  }
  return "Não foi possível carregar seu próximo passo. A API pode estar acordando — aguarde e tente de novo.";
}
