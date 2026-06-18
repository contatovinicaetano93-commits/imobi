import type { ManagerStats } from '@/lib/api';
import { readApiErrorMessage } from '@/lib/read-api-error';
import { wakeStagingApi } from '@/lib/wake-staging-api';

export async function fetchManagerDashboard(maxAttempts = 8): Promise<ManagerStats> {
  await wakeStagingApi(6);

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
      throw new Error(
        lastMessage !== 'Erro ao carregar dados do painel'
          ? `${lastMessage} Faça logout/login. Se persistir, redeploy a API no Render (commit recente).`
          : 'Acesso negado ao painel do gestor. Faça logout/login ou redeploy a API no Render.',
      );
    }

    if (res.status === 502 || res.status === 503 || res.status === 504) {
      await wakeStagingApi(4);
      await new Promise((r) => setTimeout(r, 4000 * attempt));
      continue;
    }

    throw new Error(lastMessage);
  }

  throw new Error(
    `${lastMessage} A API no Render (plano gratuito) demora para acordar — aguarde 1–2 minutos e clique em Tentar novamente.`,
  );
}
