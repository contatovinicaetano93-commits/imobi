import { NextResponse } from "next/server";
import { prisma } from "@imbobi/db";

// Sem cookies/headers no handler, o Next.js tentava otimizar como estático e
// a CDN da Vercel cacheava a resposta — health check reportava status velho.
export const dynamic = "force-dynamic";

export async function GET() {
  let databaseStatus = "error";
  let databaseError: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = "connected";
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Unknown error";
  }

  const emailProvider = process.env.EMAIL_PROVIDER ?? "smtp";

  return NextResponse.json({
    status: databaseStatus === "connected" ? "ok" : "error",
    timestamp: new Date().toISOString(),
    email: { provider: emailProvider, configured: true },
    database: { configured: !!process.env.DATABASE_URL, status: databaseStatus, ...(databaseError && { error: databaseError }) },
  });
}
