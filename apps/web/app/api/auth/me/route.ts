import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeRole } from "@/lib/role-permissions";

export async function GET() {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({
      authenticated: true,
      id: decoded.sub ?? decoded.id ?? null,
      email: decoded.email ?? null,
      nome: decoded.nome ?? decoded.name ?? null,
      role: normalizeRole(decoded.role ?? decoded.tipo ?? null),
      funcoesBloqueadas: Array.isArray(decoded.funcoesBloqueadas) ? decoded.funcoesBloqueadas : [],
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
