const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';

export async function loginViaApi(email: string, password: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha: password }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error(`API unreachable at ${API_URL} — is the NestJS server running?`);
  }
  if (!res.ok) throw new Error(`API login failed for ${email}: ${res.status}`);
  const data = await res.json() as { accessToken: string };
  return data.accessToken;
}

interface EtapaResumo {
  etapaId: string;
  nome: string;
  status: string;
  ordem: number;
  valorLiberacao?: string;
  percentualObra?: number;
}

interface ObraResumo {
  obraId: string;
  nome: string;
  status: string;
  etapas?: EtapaResumo[];
}

export async function getObras(accessToken: string): Promise<ObraResumo[]> {
  const res = await fetch(`${API_URL}/obras`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  return res.json() as Promise<ObraResumo[]>;
}

export async function findEtapaWithStatus(
  status: string,
  accessToken: string
): Promise<{ obra: ObraResumo; etapa: EtapaResumo } | null> {
  const obras = await getObras(accessToken);
  for (const obra of obras) {
    const etapa = obra.etapas?.find((e) => e.status === status);
    if (etapa) return { obra, etapa };
  }
  return null;
}


export async function getAllObrasAsAdmin(adminToken: string): Promise<ObraResumo[]> {
  // Gestor/admin can list all obras via manager endpoint
  const res = await fetch(`${API_URL}/manager/etapas`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok) return [];
  return res.json() as Promise<ObraResumo[]>;
}

export async function findEtapaWithStatusForAnyObra(
  status: string,
  adminToken: string
): Promise<{ obraId: string; etapaId: string; obraNome: string } | null> {
  const res = await fetch(`${API_URL}/manager/etapas?status=${status}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok) return null;

  const data = await res.json() as Array<{
    etapaId: string;
    obraId: string;
    obraNome?: string;
  }>;

  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];
  return {
    obraId: first.obraId,
    etapaId: first.etapaId,
    obraNome: first.obraNome ?? '',
  };
}
