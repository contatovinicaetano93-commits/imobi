import type { ManagerStats } from '@/lib/api';
import { readApiErrorMessage } from '@/lib/read-api-error';

export async function fetchManagerDashboard(): Promise<ManagerStats> {
  const res = await fetch('/api/v1/manager/dashboard', { cache: 'no-store' });

  if (res.ok) {
    const data = (await res.json().catch(() => null)) as ManagerStats | null;
    if (data && typeof data === 'object') return data;
    throw new Error('Resposta inválida do servidor. Tente novamente em instantes.');
  }

  const message = await readApiErrorMessage(res, 'Erro ao carregar dados do painel');
  if (res.status === 401) throw new Error('Sessão expirada. Faça login novamente.');
  if (res.status === 403) throw new Error(message !== 'Erro ao carregar dados do painel' ? message : 'Acesso negado ao painel.');
  throw new Error(message);
}
