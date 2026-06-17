import type { ManagerStats } from '@/lib/api';
import { wakeStagingApi } from '@/lib/wake-staging-api';

export async function fetchManagerDashboard(maxAttempts = 4): Promise<ManagerStats> {
  await wakeStagingApi(3);

  let lastMessage = 'Erro ao carregar dados do painel';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch('/api/proxy/manager/dashboard', { cache: 'no-store' });

    if (res.ok) {
      return res.json() as Promise<ManagerStats>;
    }

    const body = (await res.json().catch(() => ({}))) as { message?: string };
    lastMessage = body.message ?? lastMessage;

    if (res.status === 401) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (res.status === 403) {
      throw new Error('Seu perfil não tem permissão para acessar o painel do fundo.');
    }

    if (res.status === 502 || res.status === 503 || res.status === 504) {
      await wakeStagingApi(2);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
      continue;
    }

    throw new Error(lastMessage);
  }

  throw new Error(`${lastMessage}. Servidor pode estar acordando — aguarde 1 minuto e tente novamente.`);
}
