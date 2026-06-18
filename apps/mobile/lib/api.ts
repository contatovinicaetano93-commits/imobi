import * as SecureStore from "expo-secure-store";
import { apiClient, ApiError } from "@imbobi/core";

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

export { ApiError };

export const usuariosApi = {
  obterPerfil: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<UsuarioPerfil>("/api/v1/usuarios/meu-perfil", token ?? undefined);
    }),
};

export const obrasApi = {
  listar: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<Obra[]>("/api/v1/obras", token ?? undefined);
    }),
  buscar: (obraId: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<ObraDetalhe>(`/api/v1/obras/${obraId}`, token ?? undefined);
    }),
  progresso: (obraId: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<number>(`/api/v1/obras/${obraId}/progresso`, token ?? undefined);
    }),
};

export const creditoApi = {
  meus: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<Credito[]>("/api/v1/credito/meus", token ?? undefined);
    }),
};

export const scoreApi = {
  obter: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<ScoreData>("/api/v1/score/atual", token ?? undefined);
    }),
};

export const authApi = {
  logout: (refreshToken: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post("/api/v1/auth/logout", { refreshToken }, token ?? undefined);
    }),
};

export const pushApi = {
  registrarToken: (fcmToken: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post("/api/v1/push-notificacoes/registrar-token", { token: fcmToken }, token ?? undefined);
    }),
};

export const kycApi = {
  listarDocumentos: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<KycDocumento[]>("/api/v1/kyc/meus-documentos", token ?? undefined);
    }),
  uploadDocumento: (tipo: string, url: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post<KycDocumento>("/api/v1/kyc/upload", { tipo, url }, token ?? undefined);
    }),
  obterStatus: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<KycStatus>("/api/v1/kyc/status", token ?? undefined);
    }),
};

export const notificacoesApi = {
  listar: (page = 1) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<Notificacao[]>(`/api/v1/notificacoes?page=${page}&limit=20`, token ?? undefined);
    }),
  marcarLida: (notificacaoId: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post(`/api/v1/notificacoes/${notificacaoId}/lida`, {}, token ?? undefined);
    }),
  marcarTodasLidas: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post("/api/v1/notificacoes/marcar-todas-lidas", {}, token ?? undefined);
    }),
};

export const dadosBancariosApi = {
  buscar: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<DadosBancarios | null>("/api/v1/dados-bancarios/meus", token ?? undefined);
    }),
  salvar: (dados: SalvarDadosBancariosInput) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.put<DadosBancarios>("/api/v1/dados-bancarios", dados, token ?? undefined);
    }),
};

export const creditoHistoricoApi = {
  meusCreditosDetalhado: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<CreditoDetalhe[]>("/api/v1/credito/meus", token ?? undefined);
    }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

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
  status: "NENHUM" | "ENVIADO" | "APROVADO" | "REJEITADO";
  documentos: KycDocumento[];
  resumo: { pendentes: number; aprovados: number; rejeitados: number };
};

export type Notificacao = {
  notificacaoId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string | null;
  lida: boolean;
  criadoEm: string;
};

export type DadosBancarios = {
  dadosBancariosId: string;
  banco: string;
  agencia?: string | null;
  conta?: string | null;
  tipoConta?: "CORRENTE" | "POUPANCA" | null;
  tipoChavePix?: string | null;
  chavePix?: string | null;
  nomeTitular: string;
  cpfCnpjTitular: string;
};

export type SalvarDadosBancariosInput = {
  banco: string;
  agencia?: string;
  conta?: string;
  tipoConta?: "CORRENTE" | "POUPANCA";
  tipoChavePix?: string;
  chavePix?: string;
  nomeTitular: string;
  cpfCnpjTitular: string;
};

export type CreditoDetalhe = {
  creditoId: string;
  valorAprovado: number;
  valorLiberado: number;
  taxaMensal: number;
  prazoMeses: number;
  status: string;
  feeEstruturacao?: number | null;
  liberacoes?: LiberacaoParcela[];
};

export type LiberacaoParcela = {
  liberacaoId: string;
  valor: number;
  valorLiquido?: number | null;
  feeTranche?: number | null;
  status: string;
  criadoEm: string;
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
};
