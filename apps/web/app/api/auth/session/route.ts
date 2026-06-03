import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function POST(req: Request) {
  const { accessToken, refreshToken } = await req.json() as {
    accessToken: string;
    refreshToken: string;
  };

  const jar = await cookies();
  jar.set("access_token", accessToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 8 });       // 8 h (covers full E2E suite)
  jar.set("refresh_token", refreshToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 7 }); // 7 dias

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete("access_token");
  jar.delete("refresh_token");
  return NextResponse.json({ ok: true });
}
