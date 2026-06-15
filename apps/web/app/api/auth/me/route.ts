import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function GET() {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

  try {
    const secret = process.env["JWT_SECRET"];
    if (!secret) return NextResponse.json({ authenticated: false }, { status: 401 });

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);

    return NextResponse.json({
      authenticated: true,
      id: (payload.sub as string) ?? null,
      email: (payload.email as string) ?? null,
      nome: (payload.nome as string) ?? null,
      role: (payload.role as string) ?? (payload.tipo as string) ?? null,
      funcoesBloqueadas: Array.isArray(payload.funcoesBloqueadas) ? payload.funcoesBloqueadas : [],
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
