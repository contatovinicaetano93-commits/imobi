import axios, { AxiosInstance } from 'axios';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class ImobiAPIClient {
  private client: AxiosInstance;
  private tokens: AuthTokens | null = null;

  constructor(baseURL: string = 'http://localhost:4000/api/v1') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use((config) => {
      if (this.tokens?.accessToken) {
        config.headers.Authorization = `Bearer ${this.tokens.accessToken}`;
      }
      return config;
    });
  }

  setTokens(tokens: AuthTokens) {
    this.tokens = tokens;
  }

  async register(data: any) {
    const response = await this.client.post<AuthTokens>('/auth/registrar', data);
    this.tokens = response.data;
    return response.data;
  }

  async login(email: string, senha: string) {
    const response = await this.client.post<AuthTokens>('/auth/login', { email, senha });
    this.tokens = response.data;
    return response.data;
  }

  async getKYCStatus() {
    return this.client.get('/kyc/status');
  }

  async listWorks(page = 1, limit = 10) {
    return this.client.get('/obras', { params: { page, limit } });
  }

  async simulateCredit(valor: number, prazo: number) {
    return this.client.get('/credito/simular', { params: { valor, prazo } });
  }

  async health() {
    return this.client.get('/health');
  }
}

export default ImobiAPIClient;
