import { NextRequest } from 'next/server';
import { handleLoginPost } from '@/lib/auth-handlers';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  return handleLoginPost(req);
}
