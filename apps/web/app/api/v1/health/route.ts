import { NextResponse } from "next/server";
import { prisma } from "@imbobi/db";

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
