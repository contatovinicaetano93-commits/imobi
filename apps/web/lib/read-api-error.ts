/** Extrai mensagem de erro de respostas JSON da API/proxy sem crash em body null. */
export async function readApiErrorMessage(
  res: Response,
  fallback = 'Erro ao processar resposta',
): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body === 'object') {
      const msg = (body as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim()) return msg;
      if (Array.isArray(msg) && msg.length > 0) return String(msg[0]);
    }
  } catch {
    /* corpo vazio ou não-JSON */
  }
  return fallback;
}
