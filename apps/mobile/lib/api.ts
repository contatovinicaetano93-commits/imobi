import * as SecureStore from "expo-secure-store";
import { apiClient, ApiError } from "@imbobi/core";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("accessToken");
}

export { ApiError };

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
    return apiClient.post("/api/v1/push-notificacoes/registrar-token", { token: fcmToken }, token ?? undefined);
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

  uploadDocumento: async (tipo: string, url: string) => {
    const token = await getToken();
    return apiClient.post<KycDocumento>("/api/v1/kyc/upload", { tipo, url }, token ?? undefined);
  },
};

export const simuladorApi = {
  simular: async (params: { valorSolicitado: number; prazoMeses: number; tipoObra: "RESIDENCIAL" | "COMERCIAL" | "MISTO" }) => {
    const token = await getToken();
    return apiClient.post<SimulacaoApiResult>("/api/v1/credito/simular", params, token ?? undefined);
  },
};

export const evidenciasApi = {
  upload: async (formData: FormData, etapaId: string) => {
    const token = await getToken();
    const baseUrl = typeof process !== "undefined" ? (process.env.EXPO_PUBLIC_API_URL ?? "") : "";
    const res = await fetch(`${baseUrl}/api/v1/evidencias/${etapaId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token ?? ""}`,
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
