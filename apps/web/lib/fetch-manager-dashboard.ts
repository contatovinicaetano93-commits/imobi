import type { ManagerStats } from '@/lib/api';
import { readApiErrorMessage } from '@/lib/read-api-error';
import { wakeStagingApi } from '@/lib/wake-staging-api';

export async function fetchManagerDashboard(maxAttempts = 4): Promise<ManagerStats> {
  await wakeStagingApi(3);

  let lastMessage = 'Erro ao carregar dados do painel';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch('/api/proxy/manager/dashboard', { cache: 'no-store' });

    if (res.ok) {
      const data = (await res.json().catch(() => null)) as ManagerStats | null;
      if (data && typeof data === 'object') return data;
      throw new Error('Resposta inválida do servidor. Tente novamente em instantes.');
    }

    lastMessage = await readApiErrorMessage(res, lastMessage);

    if (res.status === 401) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (res.status === 403) {
      throw new Error('Acesso negado ao painel do gestor. Verifique se seu perfil é Gestor do Fundo.');
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
