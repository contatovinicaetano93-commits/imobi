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
