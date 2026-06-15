import * as SecureStore from "expo-secure-store";

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export function formatarBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; code?: string };
    throw new ApiError(res.status, body.message ?? res.statusText, body.code);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

let _onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  _onUnauthorized = cb;
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

type AuthResponse = { accessToken: string; refreshToken: string; usuario: { tipo: string } };

export const authApi = {
  login: (body: { email: string; senha: string }) =>
    request<AuthResponse>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(body) }),

  registrar: (body: Record<string, unknown>) =>
    request<AuthResponse>("/api/v1/auth/registrar", { method: "POST", body: JSON.stringify(body) }),

  logout: (refreshToken: string) =>
    callApi(async () => {
      const token = await getToken();
      return request<void>("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
        token: token ?? undefined,
      });
    }),
};

export const usuariosApi = {
  obterPerfil: () =>
    callApi(async () => {
      const token = await getToken();
      return request<UsuarioPerfil>("/api/v1/usuarios/me", { method: "GET", token: token ?? undefined });
    }),
};

export const obrasApi = {
  listar: () =>
    callApi(async () => {
      const token = await getToken();
      return request<Obra[]>("/api/v1/obras", { method: "GET", token: token ?? undefined });
    }),
  buscar: (obraId: string) =>
    callApi(async () => {
      const token = await getToken();
      return request<ObraDetalhe>(`/api/v1/obras/${obraId}`, { method: "GET", token: token ?? undefined });
    }),
  progresso: (obraId: string) =>
    callApi(async () => {
      const token = await getToken();
      return request<number>(`/api/v1/obras/${obraId}/progresso`, { method: "GET", token: token ?? undefined });
    }),
};

export const creditoApi = {
  meus: () =>
    callApi(async () => {
      const token = await getToken();
      return request<Credito[]>("/api/v1/credito/meus", { method: "GET", token: token ?? undefined });
    }),
  extrato: (id: string) =>
    callApi(async () => {
      const token = await getToken();
      return request<CreditoExtrato>(`/api/v1/credito/${id}/extrato`, { method: "GET", token: token ?? undefined });
    }),
};

export const scoreApi = {
  obter: () =>
    callApi(async () => {
      const token = await getToken();
      return request<ScoreData>("/api/v1/score", { method: "GET", token: token ?? undefined });
    }),
};

export const parceiroApi = {
  resumo: () =>
    callApi(async () => {
      const token = await getToken();
      return request<ParceiroResumo>("/api/v1/parceiros/resumo", { method: "GET", token: token ?? undefined });
    }),
  operacoes: () =>
    callApi(async () => {
      const token = await getToken();
      return request<OperacaoIndicada[]>("/api/v1/parceiros/operacoes", { method: "GET", token: token ?? undefined });
    }),
};

export const engenheiroApi = {
  obras: () =>
    callApi(async () => {
      const token = await getToken();
      return request<ObraEngenheiro[]>("/api/v1/engenheiros/financeiro", { method: "GET", token: token ?? undefined });
    }),
};

export const adminApi = {
  listarUsuarios: () =>
    callApi(async () => {
      const token = await getToken();
      return request<AdminUsuario[]>("/api/v1/admin/usuarios", { method: "GET", token: token ?? undefined });
    }),
  criarUsuario: (body: { nome: string; email: string; senha: string; tipo: string }) =>
    callApi(async () => {
      const token = await getToken();
      return request<AdminUsuario>("/api/v1/admin/usuarios", {
        method: "POST",
        body: JSON.stringify(body),
        token: token ?? undefined,
      });
    }),
  risco: () =>
    callApi(async () => {
      const token = await getToken();
      return request<RiscoData>("/api/v1/admin/risco", { method: "GET", token: token ?? undefined });
    }),
  atualizarUsuario: (id: string, body: { bloqueado?: boolean; tipo?: string }) =>
    callApi(async () => {
      const token = await getToken();
      return request<AdminUsuario>(`/api/v1/admin/usuarios/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
        token: token ?? undefined,
      });
    }),
};

export const kycApi = {
  listarPendentes: () =>
    callApi(async () => {
      const token = await getToken();
      return request<KycDocumento[]>("/api/v1/kyc/pendentes", { method: "GET", token: token ?? undefined });
    }),
  aprovar: (id: string) =>
    callApi(async () => {
      const token = await getToken();
      return request<void>(`/api/v1/kyc/${id}/aprovar`, {
        method: "PATCH",
        body: JSON.stringify({}),
        token: token ?? undefined,
      });
    }),
  rejeitar: (id: string, motivo: string) =>
    callApi(async () => {
      const token = await getToken();
      return request<void>(`/api/v1/kyc/${id}/rejeitar`, {
        method: "PATCH",
        body: JSON.stringify({ motivo }),
        token: token ?? undefined,
      });
    }),
};

export const notificacoesApi = {
  listar: (limit = 20, offset = 0) =>
    callApi(async () => {
      const token = await getToken();
      return request<{ notificacoes: Notificacao[]; total: number }>(
        `/api/v1/notificacoes?limit=${limit}&offset=${offset}`,
        { method: "GET", token: token ?? undefined }
      );
    }),
  marcarLida: (id: string) =>
    callApi(async () => {
      const token = await getToken();
      return request<void>(`/api/v1/notificacoes/${id}/lida`, {
        method: "PATCH",
        body: JSON.stringify({}),
        token: token ?? undefined,
      });
    }),
  marcarTodasLidas: () =>
    callApi(async () => {
      const token = await getToken();
      return request<void>("/api/v1/notificacoes/marcar-todas-lidas", {
        method: "PATCH",
        body: JSON.stringify({}),
        token: token ?? undefined,
      });
    }),
  deletar: (id: string) =>
    callApi(async () => {
      const token = await getToken();
      return request<void>(`/api/v1/notificacoes/${id}`, { method: "DELETE", token: token ?? undefined });
    }),
};

export const pushApi = {
  registrarToken: (fcmToken: string) =>
    callApi(async () => {
      const token = await getToken();
      return request<void>("/api/v1/push-notificacoes/registrar-token", {
        method: "POST",
        body: JSON.stringify({ token: fcmToken }),
        token: token ?? undefined,
      });
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
  dataAprovacao?: string;
  obras: { id: string; nome: string; status: string }[];
  liberacoes: { id: string; valor: number; status: string; processadoEm?: string }[];
};

export type CreditoExtrato = {
  creditoId: string;
  valorAprovado: number;
  valorLiberado: number;
  taxaMensal: number;
  prazoMeses: number;
  status: string;
  liberacoes: {
    liberacaoId: string;
    valor: number;
    status: string;
    criadoEm: string;
    motivo?: string;
  }[];
};

export type ScoreData = {
  score: number;
  nivel: string;
  cor: string;
  descricao: string;
};

export type ParceiroResumo = {
  comissoesAReceber: number;
  comissoesPagasMes: number;
  comissoesPagasTotal: number;
  operacoesAtivas: number;
  taxaAprovacao: number;
  codigoIndicacao: string;
};

export type OperacaoIndicada = {
  id: string;
  codigo: string;
  clienteRef: string;
  status: string;
  valorBase: number;
  percentualComissao: number;
  valorComissao: number;
  comissaoStatus: string;
  validadeIndicacao: string;
  criadoEm: string;
};

export type ObraEngenheiro = {
  obraId: string;
  nome: string;
  valorTotal: number;
  valorMaterial: number;
  valorMaoDeObra: number;
  valorExecutado: number;
  progresso: number;
  etapaAtual: string;
};

export type RiscoData = {
  carteira: {
    totalCreditos: number;
    valorTotal: number;
    valorLiberado: number;
    porStatus: { status: string; count: number; valor: number }[];
  };
  npl: {
    count: number;
    valor: number;
    percentualCarteira: number;
    porAging: { faixa: string; count: number; valor: number }[];
  };
  liberacoes: { totalFalha: number; valorFalha: number; taxaFalha: number };
};

export type AdminUsuario = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: string;
  kycStatus: string;
  bloqueadoEm: string | null;
  criadoEm: string;
  totalObras: number;
  totalCreditos: number;
};

export type KycDocumento = {
  kycDocumentoId: string;
  usuarioId: string;
  tipo: string;
  url: string;
  status: string;
  motivo_rejeicao?: string | null;
  criadoEm: string;
  usuario: { nome: string; email: string; cpf: string };
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
