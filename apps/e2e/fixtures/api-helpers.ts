import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';

/** Reutiliza JWT do auth.setup — evita login extra (rate limit Render). */
export function readAccessTokenFromStorage(storageStatePath: string): string | null {
  try {
    const raw = readFileSync(resolve(process.cwd(), storageStatePath), 'utf8');
    const state = JSON.parse(raw) as { cookies?: Array<{ name: string; value: string }> };
    return state.cookies?.find((c) => c.name === 'access_token')?.value ?? null;
  } catch {
    return null;
  }
}

export async function loginViaApi(email: string, password: string): Promise<string> {
  const retryable = new Set([429, 500, 502, 503, 504]);
  let lastError = '';

  for (let attempt = 1; attempt <= 5; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: password }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new Error(`API unreachable at ${API_URL} — is the NestJS server running?`);
    }

    if (retryable.has(res.status)) {
      lastError = await res.text().catch(() => res.statusText);
      await new Promise((r) => setTimeout(r, Math.min(60_000, 3_000 * attempt)));
      continue;
    }

    if (!res.ok) throw new Error(`API login failed for ${email}: ${res.status} ${lastError}`);
    const data = await res.json() as { accessToken: string };
    return data.accessToken;
  }

  throw new Error(`API login failed for ${email} after retries: ${lastError}`);
}

export function decodeRoleFromAccessToken(token: string): string | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
    const payload = JSON.parse(json) as { role?: string; tipo?: string };
    return payload.role ?? payload.tipo ?? null;
  } catch {
    return null;
  }
}

/** Cookies httpOnly como no login web — middleware lê access_token + session_role. */
export async function seedAuthCookies(
  context: import('@playwright/test').BrowserContext,
  email: string,
  password: string,
): Promise<void> {
  const token = await loginViaApi(email, password);
  const role = decodeRoleFromAccessToken(token);
  if (!role) throw new Error(`JWT sem role para ${email}`);

  const base = process.env.BASE_URL ?? 'http://localhost:3000';
  const u = new URL(base);
  const expires = Math.floor(Date.now() / 1000) + 8 * 3600;

  await context.addCookies([
    {
      name: 'access_token',
      value: token,
      domain: u.hostname,
      path: '/',
      httpOnly: true,
      secure: u.protocol === 'https:',
      sameSite: 'Lax',
      expires,
    },
    {
      name: 'session_role',
      value: role,
      domain: u.hostname,
      path: '/',
      httpOnly: true,
      secure: u.protocol === 'https:',
      sameSite: 'Lax',
      expires,
    },
  ]);
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
