import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyHs256Jwt } from "@/lib/verify-hs256-jwt";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function GET() {
  const jar = await cookies();
  const hasToken = !!jar.get("access_token")?.value;
  return NextResponse.json({ authenticated: hasToken });
}

export async function POST(req: Request) {
  const { accessToken, refreshToken } = await req.json() as {
    accessToken: string;
    refreshToken: string;
  };

  const accessPayload = await verifyHs256Jwt(accessToken ?? "");
  const refreshPayload = await verifyHs256Jwt(refreshToken ?? "");

  if (!accessPayload || !refreshPayload || refreshPayload.type !== "refresh") {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const jar = await cookies();
  jar.set("access_token", accessToken, { ...COOKIE_OPTS, maxAge: 60 * 15 });          // 15 min
  jar.set("refresh_token", refreshToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 7 }); // 7 dias

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete("access_token");
  jar.delete("refresh_token");
  jar.delete("session_role");
  return NextResponse.json({ ok: true });
}
