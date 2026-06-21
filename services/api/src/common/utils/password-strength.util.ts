const COMMON_PASSWORDS = new Set([
  'password', 'senha123', '123456', '12345678', 'abc123',
  'password1', 'iloveyou', 'admin123', 'letmein', 'welcome',
  'monkey', 'dragon', 'master', 'sunshine', 'princess',
  'senhaforte', 'segurança', 'brasil123', 'imbobi123',
]);

export interface StrengthResult {
  ok: boolean;
  score: number; // 0-4
  reason?: string;
}

export function checkPasswordStrength(password: string): StrengthResult {
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    return { ok: false, score: 0, reason: 'Senha muito comum.' };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score < 2) {
    return { ok: false, score, reason: 'Senha fraca. Use letras maiúsculas, números e caracteres especiais.' };
  }
  return { ok: true, score };
}
