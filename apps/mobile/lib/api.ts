import * as SecureStore from "expo-secure-store";
import { apiClient, ApiError, getApiBaseUrl } from "@imbobi/core";
import type { UpdatePerfilUsuarioInput } from "@imbobi/schemas";

let _onUnauthorized: (() => void) | null = null;
let _onSignedIn: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  _onUnauthorized = cb;
}

export function setOnSignedIn(cb: () => void) {
  _onSignedIn = cb;
}

export function notifySignedIn() {
  _onSignedIn?.();
}

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("accessToken");
}

async function callApi<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await SecureStore.deleteItemAsync("accessToken");
      _onUnauthorized?.();
    }
    throw e;
  }
}

export { ApiError };

export const usuariosApi = {
  obterPerfil: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<UsuarioPerfil>("/usuarios/meu-perfil", token ?? undefined);
    }),
  atualizarPerfil: (data: UpdatePerfilUsuarioInput) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch<UsuarioPerfil>("/usuarios/meu-perfil", data, token ?? undefined);
    }),
};

export const obrasApi = {
  listar: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<Obra[]>("/obras", token ?? undefined);
    }),
  buscar: (obraId: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<ObraDetalhe>(`/obras/${obraId}`, token ?? undefined);
    }),
  progresso: (obraId: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<number>(`/obras/${obraId}/progresso`, token ?? undefined);
    }),
};

export const creditoApi = {
  meus: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<Credito[]>("/credito/meus", token ?? undefined);
    }),
};

export const scoreApi = {
  obter: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<ScoreData>("/score/atual", token ?? undefined);
    }),
};

export const kycApi = {
  obterStatus: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<KycStatus>("/kyc/status", token ?? undefined);
    }),
  uploadDocumentoArquivo: (tipo: string, uri: string, mimeType = "image/jpeg") =>
    callApi(async () => {
      const token = await getToken();
      const ext = mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
      const form = new FormData();
      form.append("tipo", tipo);
      form.append("file", { uri, name: `kyc-${tipo}.${ext}`, type: mimeType } as never);
      const res = await fetch(`${getApiBaseUrl()}/kyc/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new ApiError(res.status, body.message ?? "Falha no upload do documento");
      }
      return res.json() as Promise<KycDocumento>;
    }),
};

export type KycDocumento = {
  tipo: string;
  status: string;
  url?: string;
  criadoEm?: string;
  motivo_rejeicao?: string;
};

export type KycStatus = {
  usuarioId: string;
  status: string;
  documentos: KycDocumento[];
  resumo: { pendentes: number; aprovados: number; rejeitados: number; totalTipos?: number };
};

export const authApi = {
  logout: (refreshToken: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post("/auth/logout", { refreshToken }, token ?? undefined);
    }),
};

export const pushApi = {
  registrarToken: (fcmToken: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post("/push-notificacoes/registrar-token", { token: fcmToken }, token ?? undefined);
    }),
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
  id: string;
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

export type UsuarioPerfil = {
  usuarioId: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  tipo: string;
  kycStatus: string;
  criadoEm: string;
  avatarUrl?: string | null;
};
