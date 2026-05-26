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

export const usuarioApi = {
  registro: async (data: { nome: string; cpf: string; email: string; telefone: string; senha: string }) => {
    return apiClient.post<{ accessToken: string; refreshToken: string }>("/auth/register", data);
  },
  perfil: async () => {
    const token = await getToken();
    return apiClient.get<Usuario>("/api/v1/usuarios/me", token ?? undefined);
  },
};

export const notificacaoApi = {
  listar: async () => {
    const token = await getToken();
    return apiClient.get<Notificacao[]>("/api/v1/notificacoes", token ?? undefined);
  },
  marcarComoLida: async (notificacaoId: string) => {
    const token = await getToken();
    return apiClient.post(`/api/v1/notificacoes/${notificacaoId}/marcar-lida`, {}, token ?? undefined);
  },
};

export const parceiroApi = {
  listar: async () => {
    const token = await getToken();
    return apiClient.get<Parceiro[]>("/api/v1/parceiros", token ?? undefined);
  },
  buscar: async (parceiroId: string) => {
    const token = await getToken();
    return apiClient.get<ParceiroPerfil>(`/api/v1/parceiros/${parceiroId}`, token ?? undefined);
  },
  reviews: async (parceiroId: string) => {
    const token = await getToken();
    return apiClient.get<Review[]>(`/api/v1/parceiros/${parceiroId}/reviews`, token ?? undefined);
  },
};

export const vistoriaApi = {
  solicitar: async (parceiroId: string) => {
    const token = await getToken();
    return apiClient.post("/api/v1/vistorias", { parceiroId }, token ?? undefined);
  },
};

// Additional types
export type Usuario = {
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
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  criadoEm: string;
  obraId?: string;
  creditoId?: string;
};

export type Parceiro = {
  parceiroId: string;
  nome: string;
  servico: string;
  descricao: string;
  rating: number;
  reviewCount: number;
  latitude: number;
  longitude: number;
  distanciaKm?: number;
  telefone?: string;
  email?: string;
};

export type ParceiroPerfil = Parceiro & {
  bio: string;
  experiencia: string;
  certificacoes: string[];
  fotos?: string[];
  disponivel: boolean;
};

export type Review = {
  reviewId: string;
  usuario: string;
  rating: number;
  comentario: string;
  data: string;
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
