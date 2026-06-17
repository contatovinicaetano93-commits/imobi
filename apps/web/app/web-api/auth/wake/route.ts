import { handleWakeGet } from '@/lib/auth-handlers';

export const maxDuration = 30;

export async function GET() {
  return handleWakeGet();
}
