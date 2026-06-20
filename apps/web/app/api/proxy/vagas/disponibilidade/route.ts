import { NextResponse } from "next/server";

const _base = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
const API = _base.endsWith("/api/v1") ? _base : `${_base}/api/v1`;

const LIMITE: Record<string, number> = { AC: 50, BCT: 20, BC: 20, NMA: 20 };

export async function GET() {
  try {
    const res = await fetch(`${API}/vagas/disponibilidade`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // fallback abaixo
  }

  // Fallback enquanto o endpoint NestJS não existe: todas as vagas disponíveis
  const fallback = Object.fromEntries(
    Object.entries(LIMITE).map(([id, total]) => [
      id,
      { total, preenchidas: 0, restantes: total },
    ]),
  );
  return NextResponse.json(fallback);
}
