import * as SecureStore from "expo-secure-store";
import { apiClient, ApiError } from "@imbobi/core";
import { ensureCsrfToken, fetchCsrfToken } from "./csrf-token";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("accessToken");
}

export { ApiError };

// Enhanced API request with CSRF token support for state-changing operations
declare const process: any;

const BASE_URL =
  typeof process !== "undefined"
    ? (process.env.EXPO_PUBLIC_API_URL ?? "")
    : "";

export async function requestWithCsrf<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE" | "PATCH",
  body: unknown,
  token?: string,
  csrfToken?: string
): Promise<T> {
  // Ensure we have a CSRF token for state-changing requests
  const tokenToUse = csrfToken || (await ensureCsrfToken());

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("x-csrf-token", tokenToUse);

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });

  // Handle 403 CSRF errors - fetch new token and retry once
  if (res.status === 403) {
    try {
      const newCsrfToken = await fetchCsrfToken();
      const retryHeaders = new Headers();
      retryHeaders.set("Content-Type", "application/json");
      if (token) retryHeaders.set("Authorization", `Bearer ${token}`);
      retryHeaders.set("x-csrf-token", newCsrfToken);

      const retryRes = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: retryHeaders,
        body: JSON.stringify(body),
      });

      if (!retryRes.ok) {
        const body = (await retryRes.json().catch(() => ({}))) as { message?: string; code?: string };
        throw new ApiError(retryRes.status, body.message ?? retryRes.statusText, body.code);
      }

      if (retryRes.status === 204) return undefined as T;
      return retryRes.json() as Promise<T>;
    } catch (error) {
      // If retry fails, fall through to original error handling
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
    throw new ApiError(res.status, body.message ?? res.statusText, body.code);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Initialize CSRF token on app startup
export async function initializeCsrfToken(): Promise<void> {
  try {
    await ensureCsrfToken();
  } catch (error) {
    console.error("Failed to initialize CSRF token:", error);
    // Don't fail app startup if CSRF token fetch fails
  }
}

export const obrasApi = {
  listar: async () => {
    const token = await getToken();
    return apiClient.get<Obra[]>("/api/v1/obras", token ?? undefined);
  },
  buscar: async (obraId: string) => {
    const token = await getToken();
    return apiClient.get<ObraDetalhe>(`/api/v1/obras/${obraId}`, token ?? undefined);
  },
  progresso: async (obraId: string) => {
    const token = await getToken();
    return apiClient.get<number>(`/api/v1/obras/${obraId}/progresso`, token ?? undefined);
  },
};

export const creditoApi = {
  meus: async () => {
    const token = await getToken();
    return apiClient.get<Credito[]>("/api/v1/credito/meus", token ?? undefined);
  },
  solicitar: async (params: {
    valorSolicitado: number;
    prazoMeses: number;
    tipoObra: "RESIDENCIAL" | "COMERCIAL" | "MISTO";
    finalidade: string;
    rendaMensalDeclarada: number;
  }) => {
    const token = await getToken();
    return requestWithCsrf<{ creditoId: string; status: string }>(
      "/api/v1/credito/solicitar",
      "POST",
      params,
      token ?? undefined
    );
  },
};

export const scoreApi = {
  obter: async () => {
    const token = await getToken();
    return apiClient.get<ScoreData>("/api/v1/score", token ?? undefined);
  },
};

export const pushApi = {
  registrarToken: async (fcmToken: string) => {
    const token = await getToken();
    return requestWithCsrf(
      "/api/v1/push-notificacoes/registrar-token",
      "POST",
      { token: fcmToken },
      token ?? undefined
    );
  },
};

export const kycApi = {
  listarDocumentos: async () => {
    const token = await getToken();
    return apiClient.get<KycDocumento[]>("/api/v1/kyc/documentos", token ?? undefined);
  },

  obterStatus: async () => {
    const token = await getToken();
    return apiClient.get<KycStatus>("/api/v1/kyc/status", token ?? undefined);
  },

  verificarCompleto: async () => {
    const token = await getToken();
    return apiClient.get<{ completo: boolean; documentos: KycDocumento[] }>("/api/v1/kyc/verificar", token ?? undefined);
  },

  gerarPresignedUrl: async (tipo: string, mimeType: string) => {
    const token = await getToken();
    return requestWithCsrf<{ uploadUrl: string; key: string; expiresIn: number }>(
      `/api/v1/kyc/presigned-url?tipo=${tipo}&mimeType=${mimeType}`,
      "POST",
      {},
      token ?? undefined
    );
  },

  uploadDocumento: async (tipo: string, url: string) => {
    const token = await getToken();
    return requestWithCsrf<KycDocumento>(
      "/api/v1/kyc/upload",
      "POST",
      { tipo, url },
      token ?? undefined
    );
  },
};

export const simuladorApi = {
  simular: async (params: { valorSolicitado: number; prazoMeses: number; tipoObra: "RESIDENCIAL" | "COMERCIAL" | "MISTO" }) => {
    const token = await getToken();
    return requestWithCsrf<SimulacaoApiResult>(
      "/api/v1/credito/simular",
      "POST",
      params,
      token ?? undefined
    );
  },
};

export const evidenciasApi = {
  upload: async (formData: FormData, etapaId: string) => {
    const token = await getToken();
    const csrfToken = await ensureCsrfToken();
    const baseUrl = typeof process !== "undefined" ? (process.env.EXPO_PUBLIC_API_URL ?? "") : "";
    const res = await fetch(`${baseUrl}/api/v1/evidencias/${etapaId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token ?? ""}`,
        "x-csrf-token": csrfToken,
      },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      throw new ApiError(res.status, body.message ?? res.statusText);
    }
    return res.json() as Promise<{ evidenciaId: string }>;
  },
  listar: async (obraId: string) => {
    const token = await getToken();
    return apiClient.get<Evidencia[]>(`/api/v1/obras/${obraId}/evidencias`, token ?? undefined);
  },
};

// Types
export type Obra = {
  obraId: string;
  nome: string;
  endereco: string;
  status: string;
  geoLatitude: number;
  geoLongitude: number;
  raioValidacaoMetros: number;
  etapas?: Etapa[];
};

export type ObraDetalhe = Obra & {
  credito?: { creditoId: string; valorAprovado: number; valorLiberado: number; status: string } | null;
  etapas: (Etapa & { evidencias: Evidencia[] })[];
};

export type Etapa = {
  etapaId: string;
  nome: string;
  ordem: number;
  percentualObra: number;
  valorLiberacao: number;
  status: string;
};

export type Evidencia = {
  evidenciaId: string;
  fotoUrl: string;
  validada: boolean;
  criadoEm: string;
};

export type Credito = {
  creditoId: string;
  valorAprovado: number;
  valorLiberado: number;
  taxaMensal: number;
  prazoMeses: number;
  status: string;
};

export type ScoreData = {
  score: number;
  nivel: string;
  cor: string;
  descricao: string;
};

export type KycDocumento = {
  kycDocumentoId: string;
  usuarioId: string;
  tipo: string;
  url: string;
  status: "PENDENTE" | "APROVADO" | "REJEITADO";
  analisadoEm?: string;
  analisadoPor?: string;
  motivo_rejeicao?: string;
  criadoEm: string;
};

export type KycStatus = {
  usuarioId: string;
  status: "NENHUM" | "ENVIADO" | "APROVADO";
  documentos: KycDocumento[];
  resumo: {
    pendentes: number;
    aprovados: number;
    rejeitados: number;
  };
};

export type SimulacaoApiResult = {
  parcelaMensal: number;
  totalPago: number;
  totalJuros: number;
  cet: number;
};
