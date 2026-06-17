import { NextRequest } from 'next/server';
import { handleLoginPost } from '@/lib/auth-handlers';

export const maxDuration = 60;

/** Rota fora de /api — evita rewrite da Vercel para o backend Render. */
export async function POST(req: NextRequest) {
  return handleLoginPost(req);
}
