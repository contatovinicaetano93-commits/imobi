import * as SecureStore from "expo-secure-store";
import { apiClient, ApiError } from "@imbobi/core";

let _onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  _onUnauthorized = cb;
}

function apiBaseUrl(): string {
  const base = process.env["EXPO_PUBLIC_API_URL"] ?? "http://localhost:4000";
  return base.endsWith("/api/v1") ? base : `${base.replace(/\/$/, "")}/api/v1`;
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
      await SecureStore.deleteItemAsync("refreshToken");
      _onUnauthorized?.();
    }
    throw e;
  }
}

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  usuario?: {
    usuarioId: string;
    nome: string;
    email: string;
    tipo: string;
    kycStatus?: string;
  };
};

export async function salvarTokens(res: AuthResponse): Promise<void> {
  await SecureStore.setItemAsync("accessToken", res.accessToken);
  await SecureStore.setItemAsync("refreshToken", res.refreshToken);
}

export { ApiError };

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function normalizeUsuarioPerfil(raw: Record<string, unknown>): UsuarioPerfil {
  return {
    usuarioId: asString(raw.usuarioId ?? raw.id),
    nome: asString(raw.nome),
    email: asString(raw.email),
    cpf: asString(raw.cpf),
    telefone: asString(raw.telefone),
    tipo: asString(raw.tipo, "TOMADOR"),
    kycStatus: asString(raw.kycStatus),
    criadoEm: asString(raw.criadoEm),
  };
}

function normalizeObra(raw: Record<string, unknown>): Obra {
  return {
    obraId: asString(raw.obraId ?? raw.id),
    nome: asString(raw.nome),
    endereco: asString(raw.endereco),
    status: asString(raw.status),
    geoLatitude: Number(raw.geoLatitude ?? 0),
    geoLongitude: Number(raw.geoLongitude ?? 0),
    raioValidacaoMetros: Number(raw.raioValidacaoMetros ?? 80),
    etapas: Array.isArray(raw.etapas)
      ? (raw.etapas as Record<string, unknown>[]).map(normalizeEtapa)
      : undefined,
  };
}

function normalizeEtapa(raw: Record<string, unknown>): Etapa {
  return {
    etapaId: asString(raw.etapaId ?? raw.id),
    nome: asString(raw.nome),
    ordem: Number(raw.ordem ?? 0),
    percentualObra: Number(raw.percentualObra ?? 0),
    valorLiberacao: Number(raw.valorLiberacao ?? 0),
    status: asString(raw.status),
    evidencias: Array.isArray(raw.evidencias)
      ? (raw.evidencias as Record<string, unknown>[]).map(normalizeEvidencia)
      : undefined,
  };
}

function normalizeEvidencia(raw: Record<string, unknown>): Evidencia {
  return {
    evidenciaId: asString(raw.evidenciaId ?? raw.id),
    fotoUrl: asString(raw.fotoUrl ?? raw.url),
    validada: Boolean(raw.validada),
    criadoEm: asString(raw.criadoEm),
  };
}

function normalizeObraDetalhe(raw: Record<string, unknown>): ObraDetalhe {
  const obra = normalizeObra(raw);
  return {
    ...obra,
    credito: raw.credito as ObraDetalhe["credito"],
    etapas: Array.isArray(raw.etapas)
      ? (raw.etapas as Record<string, unknown>[]).map((e) => ({
          ...normalizeEtapa(e),
          evidencias: (normalizeEtapa(e).evidencias ?? []) as Evidencia[],
        }))
      : [],
  };
}

function normalizeCredito(raw: Record<string, unknown>): Credito {
  const id = asString(raw.creditoId ?? raw.id);
  return {
    id,
    creditoId: id,
    valorAprovado: Number(raw.valorAprovado ?? 0),
    valorLiberado: Number(raw.valorLiberado ?? 0),
    taxaMensal: Number(raw.taxaMensal ?? 0),
    prazoMeses: Number(raw.prazoMeses ?? 0),
    status: asString(raw.status),
  };
}

function normalizeNotificacao(raw: Record<string, unknown>): Notificacao {
  return {
    notificacaoId: asString(raw.notificacaoId ?? raw.id),
    tipo: asString(raw.tipo),
    titulo: asString(raw.titulo),
    mensagem: asString(raw.mensagem),
    link: raw.link != null ? asString(raw.link) : null,
    lida: Boolean(raw.lida),
    lidoEm: raw.lidoEm != null ? asString(raw.lidoEm) : null,
    criadoEm: asString(raw.criadoEm),
  };
}

function normalizeKycDocumento(raw: Record<string, unknown>): KycDocumento {
  return {
    kycDocumentoId: asString(raw.kycDocumentoId ?? raw.id),
    tipo: asString(raw.tipo),
    url: asString(raw.url),
    status: (asString(raw.status, "PENDENTE") as KycDocumento["status"]),
    motivo_rejeicao: raw.motivo_rejeicao != null ? asString(raw.motivo_rejeicao) : null,
    criadoEm: asString(raw.criadoEm),
  };
}

export const usuariosApi = {
  obterPerfil: () =>
    callApi(async () => {
      const token = await getToken();
      const data = await apiClient.get<Record<string, unknown>>("/usuarios/meu-perfil", token ?? undefined);
      return normalizeUsuarioPerfil(data);
    }),
  atualizarPerfil: (dados: { nome?: string; telefone?: string }) =>
    callApi(async () => {
      const token = await getToken();
      const data = await apiClient.patch<Record<string, unknown>>("/usuarios/meu-perfil", dados, token ?? undefined);
      return normalizeUsuarioPerfil(data);
    }),
};

export const obrasApi = {
  listar: () =>
    callApi(async () => {
      const token = await getToken();
      const data = await apiClient.get<unknown[]>("/obras", token ?? undefined);
      return (Array.isArray(data) ? data : []).map((o) => normalizeObra(o as Record<string, unknown>));
    }),
  buscar: (obraId: string) =>
    callApi(async () => {
      const token = await getToken();
      const data = await apiClient.get<Record<string, unknown>>(`/obras/${obraId}`, token ?? undefined);
      return normalizeObraDetalhe(data);
    }),
  progresso: (obraId: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<number>(`/obras/${obraId}/progresso`, token ?? undefined);
    }),
  criar: (dados: Record<string, unknown>) =>
    callApi(async () => {
      const token = await getToken();
      const data = await apiClient.post<Record<string, unknown>>("/obras", dados, token ?? undefined);
      return normalizeObraDetalhe(data);
    }),
};

export const creditoApi = {
  meus: () =>
    callApi(async () => {
      const token = await getToken();
      const data = await apiClient.get<unknown[]>("/credito/meus", token ?? undefined);
      return (Array.isArray(data) ? data : []).map((c) => normalizeCredito(c as Record<string, unknown>));
    }),
  simular: (valorSolicitado: number, prazoMeses: number) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post<SimulacaoCreditoResult>("/credito/simular", { valorSolicitado, prazoMeses }, token ?? undefined);
    }),
};

export const scoreApi = {
  obter: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<ScoreData>("/score/atual", token ?? undefined);
    }),
};

export const authApi = {
  login: (email: string, senha: string) =>
    callApi(async () => apiClient.post<AuthResponse>("/auth/login", { email, senha })),
  registrar: (dados: Record<string, unknown>) =>
    callApi(async () => apiClient.post<AuthResponse>("/auth/registrar", dados)),
  esqueceuSenha: (email: string) =>
    callApi(async () => apiClient.post<{ message?: string }>("/auth/esqueceu-senha", { email })),
  redefinirSenha: (token: string, novaSenha: string) =>
    callApi(async () => apiClient.post<{ ok: boolean }>("/auth/redefinir-senha", { token, novaSenha })),
  logout: (refreshToken: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post("/auth/logout", { refreshToken }, token ?? undefined);
    }),
};

export const notificacoesApi = {
  listar: (limit = 20, offset = 0) =>
    callApi(async () => {
      const token = await getToken();
      const data = await apiClient.get<{ notificacoes: unknown[]; total: number }>(
        `/notificacoes?limit=${limit}&offset=${offset}`,
        token ?? undefined
      );
      return {
        notificacoes: data.notificacoes.map((n) => normalizeNotificacao(n as Record<string, unknown>)),
        total: data.total,
      };
    }),
  contarNaoLidas: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<{ count: number }>("/notificacoes/contar-nao-lidas", token ?? undefined);
    }),
  marcarComoLida: (id: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch<void>(`/notificacoes/${id}/lida`, {}, token ?? undefined);
    }),
  marcarTodasComoLidas: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch<{ ok: boolean }>("/notificacoes/marcar-todas-lidas", {}, token ?? undefined);
    }),
  listarNaoLidas: () =>
    callApi(async () => {
      const token = await getToken();
      const data = await apiClient.get<unknown[]>("/notificacoes/nao-lidas", token ?? undefined);
      return (Array.isArray(data) ? data : []).map((n) => normalizeNotificacao(n as Record<string, unknown>));
    }),
  listarPorStatus: (lida: boolean, limit = 50, offset = 0) =>
    callApi(async () => {
      const token = await getToken();
      const data = await apiClient.get<{ notificacoes: unknown[]; total: number }>(
        `/notificacoes?limit=${limit}&offset=${offset}&lida=${lida}`,
        token ?? undefined
      );
      return {
        notificacoes: data.notificacoes.map((n) => normalizeNotificacao(n as Record<string, unknown>)),
        total: data.total,
      };
    }),
};

export const kycApi = {
  listarDocumentos: () =>
    callApi(async () => {
      const token = await getToken();
      const data = await apiClient.get<unknown[]>("/kyc/documentos", token ?? undefined);
      return (Array.isArray(data) ? data : []).map((d) => normalizeKycDocumento(d as Record<string, unknown>));
    }),
  obterStatus: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<KycStatus>("/kyc/status", token ?? undefined);
    }),
  uploadArquivo: async (tipo: string, uri: string, mimeType: string, fileName?: string): Promise<KycDocumento> => {
    const token = await getToken();
    const form = new FormData();
    form.append("file", { uri, name: fileName ?? `kyc-${tipo}.jpg`, type: mimeType } as never);
    form.append("tipo", tipo);
    const res = await fetch(`${apiBaseUrl()}/kyc/upload-arquivo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token ?? ""}` },
      body: form,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(err.message ?? "Erro no upload");
    }
    return normalizeKycDocumento((await res.json()) as Record<string, unknown>);
  },
};

export const pushApi = {
  registrarToken: (fcmToken: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post("/push-notificacoes/registrar-token", { token: fcmToken }, token ?? undefined);
    }),
};

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
  evidencias?: Evidencia[];
};

export type Evidencia = {
  evidenciaId: string;
  fotoUrl: string;
  validada: boolean;
  criadoEm: string;
};

export type Credito = {
  id: string;
  creditoId: string;
  valorAprovado: number;
  valorLiberado: number;
  taxaMensal: number;
  prazoMeses: number;
  status: string;
};

export type SimulacaoCreditoResult = {
  parcelaMensal: number;
  totalPago: number;
  totalJuros: number;
  cet: number;
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
};

export type Notificacao = {
  notificacaoId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string | null;
  lida: boolean;
  lidoEm?: string | null;
  criadoEm: string;
};

export type KycDocumento = {
  kycDocumentoId: string;
  tipo: string;
  url: string;
  status: "PENDENTE" | "APROVADO" | "REJEITADO";
  motivo_rejeicao?: string | null;
  criadoEm: string;
};

export type KycStatus = {
  usuarioId: string;
  status: string;
  documentos: KycDocumento[];
  resumo: { pendentes: number; aprovados: number; rejeitados: number };
};
