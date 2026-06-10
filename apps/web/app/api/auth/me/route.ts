import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    return NextResponse.json({
      authenticated: true,
      id: decoded.sub ?? decoded.id ?? null,
      email: decoded.email ?? null,
      nome: decoded.nome ?? decoded.name ?? null,
      role: decoded.role ?? decoded.tipo ?? null,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
